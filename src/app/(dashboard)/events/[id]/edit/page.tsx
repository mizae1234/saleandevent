import EditEventClient from "./EditEventClient";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <EditEventClient eventId={id} />;
}
