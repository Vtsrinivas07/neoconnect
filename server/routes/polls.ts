import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../auth";
import { PollModel } from "../models";

const router = Router();

const createPollSchema = z.object({
  question: z.string().min(8),
  options: z.array(z.string().min(1)).min(2)
});

const voteSchema = z.object({
  optionIndex: z.number().int().min(0)
});

function serializePoll(poll: any, userId?: string) {
  const totalVotes = poll.options.reduce((sum: number, option: any) => sum + option.votes, 0);

  return {
    id: poll._id.toString(),
    question: poll.question,
    options: poll.options,
    createdAt: poll.createdAt,
    createdByName: poll.createdByName,
    hasVoted: userId ? poll.voters.some((voter: any) => voter.toString() === userId) : false,
    totalVotes
  };
}

router.get("/", requireAuth(), async (request: AuthenticatedRequest, response) => {
  const polls = await PollModel.find().sort({ createdAt: -1 });
  return response.json(polls.map((poll) => serializePoll(poll, request.user?.id)));
});

router.post("/", requireAuth(["secretariat", "admin"]), async (request: AuthenticatedRequest, response) => {
  const parsed = createPollSchema.safeParse({
    ...request.body,
    options: Array.isArray(request.body.options)
      ? request.body.options
      : String(request.body.options || "")
          .split("\n")
          .map((option) => option.trim())
          .filter(Boolean)
  });

  if (!parsed.success) {
    return response.status(400).json({ message: "Add a poll question and at least two options." });
  }

  const poll = await PollModel.create({
    question: parsed.data.question,
    options: parsed.data.options.map((label) => ({ label, votes: 0 })),
    createdBy: request.user!.id,
    createdByName: request.user!.name
  });

  return response.status(201).json(serializePoll(poll, request.user!.id));
});

router.post("/:id/vote", requireAuth(["staff"]), async (request: AuthenticatedRequest, response) => {
  const parsed = voteSchema.safeParse(request.body);

  if (!parsed.success) {
    return response.status(400).json({ message: "Select a valid poll option." });
  }

  const poll = await PollModel.findById(request.params.id);

  if (!poll) {
    return response.status(404).json({ message: "Poll not found." });
  }

  const userId = request.user!.id;

  if (poll.voters.some((voter) => voter.toString() === userId)) {
    return response.status(409).json({ message: "You have already voted in this poll." });
  }

  if (!poll.options[parsed.data.optionIndex]) {
    return response.status(400).json({ message: "Poll option does not exist." });
  }

  poll.options[parsed.data.optionIndex].votes += 1;
  poll.voters.push(userId as any);
  await poll.save();

  return response.json(serializePoll(poll, userId));
});

export default router;