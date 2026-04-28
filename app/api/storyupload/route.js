import {writeFile} from "fs/promises"
import path from "path";
import { NextResponse } from "next/server";
export async function POST(req){

  const body =await req.formData()
 
   const file = body.get("file")

   const bytes =  await file.arrayBuffer()
   const buffer= Buffer.from(bytes)
   
   const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}-${file.name}`;
  const filepath= path.join(process.cwd(),"/public/story/"+fileName)


   await writeFile(filepath,buffer)
   
    return  NextResponse.json({mediaUrl:"/story/"+fileName})
}