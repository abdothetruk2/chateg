import Messages from "../../../models/Messages";
import connectDB from "../../../lib/mongoose";
import { NextResponse } from "next/server";



import { writeFile } from "fs/promises";
import path from "path";
export async function POST(req) {
    await connectDB()

  const formData = await req.formData();
  const file = formData.get("file");
  const sender=formData.get("sender");
  const receiver= formData.get("receiver");
const avatar=formData.get("avatar")
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

const ext = file.type.includes("mp4")
  ? "m4a"
  : file.type.includes("mpeg")
  ? "mp3"
  : "webm";
  const fileName = `${Date.now()}.${ext}`;
  const filePath = path.join(process.cwd(), "public/voice/", fileName);
    const fileurl=`/voice/${fileName}`
  await writeFile(filePath, buffer);
  const message2 = await  Messages.create({
        sender: sender,
        receiver: receiver,
        media:fileurl,
        avatar:avatar,
        
      });
  
  return Response.json({
    url: fileurl,

  });


}