import Messages from "../../../models/Messages"
import connectDB from "../../../lib/mongoose"
import { NextResponse } from "next/server"
export async function POST(req){

  const body=await req.json()
 await connectDB()

const unread = await Messages.updateMany(
  {
    sender: body.receiver,   // اللي بعت الرسالة
    receiver: body.sender,   // أنا المستلم
    read: false              // بس اللي مش متقريه
  },
  {
    $set: { read: true }
  }
);return NextResponse.json(unread)

}
