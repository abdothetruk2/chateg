
import { NextResponse } from "next/server";
import connectDB from "../../../lib/mongoose"
import Group from "../../../models/Group"
import { writeFile } from "fs/promises";
import path from "path";
export async function POST(req){

const formdata = await req.formData()
     await connectDB()

const file=formdata.get("file")
const  name=formdata.get("name")  
const bytes=await file.arrayBuffer()
const  buffer=Buffer(bytes)  
  const filename=`${Date.now()}${ Math.random().toString(36).substring(2)}${file.name}`
  const filepath=path.join(process.cwd(),"/public/group/"+filename)
   await writeFile(filepath,buffer)
const fileurl = "/group/" + filename;

const  group=await Group.findOneAndUpdate({name:name},{avatar:fileurl})

return NextResponse.json({group:group,avatar:fileurl},)


}
