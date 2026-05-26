import { INTERNAL_SERVER_ERROR } from "../../constants/http";
import { getAssessmentQueue } from "../../queues";
import { AppError } from "../../utils/errors";
import type { AssessmentJobData } from "./assessment.types";

export const enqueueAssessmentGeneration = async (
  jobPayload: AssessmentJobData
) => {
  const queue = getAssessmentQueue();
  const job = await queue.add("generate-assessment", jobPayload);
  const jobId = job.id;

  if (!jobId) {
    throw new AppError(
      INTERNAL_SERVER_ERROR,
      "Failed to generate jobId from BullMQ"
    );
  }

  return { job, jobId };
};
