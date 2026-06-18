import { redirect } from "next/navigation";

export default function PersonalIndex() {
  redirect("/personal/notes");
}
