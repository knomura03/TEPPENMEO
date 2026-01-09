import { runSchedulerTick } from "@/server/services/jobs/scheduler";

async function main() {
  const result = await runSchedulerTick({ now: new Date() });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
