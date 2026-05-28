import { revalidatePath } from "next/cache";

export function revalidatePodcastSurfaces() {
  revalidatePath("/host/events");
  revalidatePath("/host/podcasts");
  revalidatePath("/podcasts");
  revalidatePath("/podcasts/episodes");
  revalidatePath("/");
  revalidatePath("/admin/featured");
}
