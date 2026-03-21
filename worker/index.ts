export default {
	async fetch(_request: Request): Promise<Response> {
		return new Response("Hello from ical-filter", {
			status: 200,
			headers: { "content-type": "text/plain" },
		});
	},
} satisfies ExportedHandler<Env>;
