import { type NextRequest } from "next/server";
import { auth } from "@/auth";
import { deleteProfilePhoto, loadProfilePhoto, PhotoInputError, sanitizeProfilePhoto, saveProfilePhoto } from "@/lib/auth/profile-photo";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function json(body: object, status = 200) {
  return Response.json(body, { status, headers });
}

export async function GET() {
  const id = (await auth())?.user?.id;
  if (!id) return json({ error: "Sign in to view your photo." }, 401);
  const image = await loadProfilePhoto(id);
  if (!image) return json({ error: "No profile photo." }, 404);
  return new Response(new Uint8Array(image), { headers: { ...headers, "Content-Type": "image/webp" } });
}

async function changePhoto(request: NextRequest, method: "save" | "remove") {
  // Next may normalize the internal hostname, for example 127.0.0.1 to localhost.
  const host = request.headers.get("host");
  const origin = host ? `${request.nextUrl.protocol}//${host}` : request.nextUrl.origin;
  if (request.headers.get("origin") !== origin) {
    return json({ error: "Open your profile directly from KitCart." }, 403);
  }
  const id = (await auth())?.user?.id;
  if (!id) return json({ error: "Sign in again to change your photo." }, 401);
  try {
    if (method === "remove") {
      if (!(await deleteProfilePhoto(id))) return json({ error: "Account unavailable." }, 403);
      return json({ imageUrl: null });
    }
    const version = await saveProfilePhoto(id, await sanitizeProfilePhoto(request));
    if (!version) return json({ error: "Account unavailable." }, 403);
    return json({ imageUrl: `/api/account/photo?v=${version}` });
  } catch (error) {
    if (error instanceof PhotoInputError) return json({ error: error.message }, error.status);
    return json({ error: "KitCart couldn’t update the photo. Try again." }, 503);
  }
}

export async function POST(request: NextRequest) {
  return changePhoto(request, "save");
}

export async function DELETE(request: NextRequest) {
  return changePhoto(request, "remove");
}
