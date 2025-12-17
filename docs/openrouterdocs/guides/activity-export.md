# Activity Export

> Learn how to export your OpenRouter usage data as CSV or PDF reports, grouped by API key, model, or organization member.

Export your aggregated usage data as CSV or PDF from the [Activity page](https://openrouter.ai/activity).

## Overview

The Activity page shows three metrics:

* **Spend**: Total spend (OpenRouter credits + estimated BYOK spend)
* **Tokens**: Total tokens used (prompt + completion)
* **Requests**: Number of AI requests (chatroom included)

Filter by time period (1 Hour, 1 Day, 1 Month, 1 Year) and group by Model, API Key, or Creator (org member). Each time period is sub-grouped by minute, hour, day, and month, respectively.

<Note title="Estimated BYOK Spend">
  Dollars spent for external BYOK usage is estimated based on market rates for that provider, and don't reflect any discounts you might have from them.
</Note>

## How to Export

1. Go to [openrouter.ai/activity](https://openrouter.ai/activity)
2. Select your time period and grouping
3. Open the options dropdown (top right)
4. Choose **Export to...** then **CSV** or **PDF**

![Activity Overview](file:60bf2ceb-7719-4e1c-bfc7-4646eec17e7a)

This exports a summary of all three metrics. For detailed breakdowns, click into a specific metric first.

## Detailed Exports

Click any metric card to expand it. From there you can:

* See breakdowns by your selected grouping
* Export the detailed data as CSV or PDF

![Spend by API Key](file:45436531-29d3-4b6f-8900-a0e89b75c5b4)

For example, a detailed "Tokens by API Key" export to pdf for the last year. It starts with a summary page for all keys, and then granular breakdowns for each key individually:

![PDF Token Report](file:3a2cf2d4-49c1-49c0-ad65-522fe583ed2c)

<Note title="Reasoning Tokens">
  Reasoning tokens are included in completion tokens for billing. This shows how many of the completion tokens were used thinking before responding.
</Note>
