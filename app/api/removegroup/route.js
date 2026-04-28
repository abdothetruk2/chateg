import connectDB from "../../../lib/mongoose";
import Group from "../../../models/Group";

export async function POST(req) {
  try {
    const body = await req.json();

    await connectDB();

    const deletedGroup = await Group.findByIdAndDelete(body.groupId);

    if (!deletedGroup) {
      return Response.json({ error: "Group not found" }, { status: 404 });
    }

    return Response.json(
      {
        message: "Group removed successfully",
        group: deletedGroup,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}   
