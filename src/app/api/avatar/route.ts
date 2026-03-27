import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const memberId = formData.get("memberId") as string | null;

  if (!file || !memberId) {
    return NextResponse.json(
      { error: "file and memberId are required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Upload avatar to storage
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `avatars/${memberId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Remove old avatar if exists
  await supabase.storage.from("screenshots").remove([storagePath]);

  const { error: uploadErr } = await supabase.storage
    .from("screenshots")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("screenshots")
    .getPublicUrl(storagePath);

  // Update member
  const { error: updateErr } = await supabase
    .from("members")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", memberId);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }

  return NextResponse.json({ avatar_url: urlData.publicUrl });
}
