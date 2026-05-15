const { SageMakerRuntimeClient, InvokeEndpointCommand } = require('@aws-sdk/client-sagemaker-runtime');

const REGION = process.env.AWS_REGION || 'us-east-1';
const ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME;

const sagemakerClient = new SageMakerRuntimeClient({ region: REGION });

/**
 * Invoke SageMaker endpoint for AI candidate ranking.
 * Returns the parsed response or null on failure.
 */
async function invokeRankingEndpoint(donationData, candidates, candidateType, topN = 3) {
  if (!ENDPOINT_NAME) {
    console.warn('[SageMaker] SAGEMAKER_ENDPOINT_NAME not set, skipping SageMaker invocation');
    return null;
  }

  const payload = {
    donation: donationData,
    candidates,
    candidateType,
    topN,
  };

  try {
    const command = new InvokeEndpointCommand({
      EndpointName: ENDPOINT_NAME,
      ContentType: 'application/json',
      Body: JSON.stringify(payload),
    });

    const response = await sagemakerClient.send(command);
    const resultText = await response.Body.transformToString();
    const result = JSON.parse(resultText);

    if (result.success && result.recommendations?.length > 0) {
      console.log(`[SageMaker] Ranking returned ${result.recommendations.length} recommendations`);
      return result;
    }

    console.warn('[SageMaker] Endpoint returned no recommendations:', result.error);
    return null;
  } catch (error) {
    console.error('[SageMaker] Error invoking endpoint:', error.message);
    return null;
  }
}

module.exports = {
  invokeRankingEndpoint,
};
