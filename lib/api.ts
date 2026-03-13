export async function apiRequest<T>(input: string, init: RequestInit = {}) {
  const response = await fetch(input, {
    credentials: "include",
    cache: "no-store",
    ...init
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.message || "Request failed.");
  }

  return data as T;
}