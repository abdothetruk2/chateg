import { bytes } from "stream/consumers";
import connectDB from "../../../lib/mongoose";

import User  from "../../../models/User";

import { writeFile } from "fs/promises";
import { arrayBuffer } from "stream/consumers";
import path from "path";
import { NextResponse } from "next/server";

export async function POST(req){

  
    const formData=  await req.formData()
    
    await connectDB()
  
  const file=formData.get("file")
  const userId=formData.get("userId")
       const bytes = await file.arrayBuffer();

  const buffers= Buffer(bytes)
  const filename=`${Date.now()}${ Math.random().toString(36).substring(2)}${file.name}`
  const filepath=path.join(process.cwd(),"/public/media/"+filename)


 
   await writeFile(filepath,buffers)
  const mediaUrl="/media/"+filename
 await User.findOneAndUpdate({_id:userId},{$push:{media:mediaUrl}},{new:true})

 return NextResponse.json({media:mediaUrl})

   
}