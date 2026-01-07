// This example shows how to search a Mixedbread store for information.

import { generateText, stepCountIs } from "ai";
import { searchTool } from "@mixedbread/ai-sdk";

const storeIdentifier = "hf-papers-2025-jan-sep-dev";

const PROMPT = `
You are a helpful assistant that can search the ${storeIdentifier} Mixedbread
store for information.

Answer these questions based on the information in the store:
1. In the 2025 paper by Singh, Nan, Wang, D’Souza, Kapoor, Üstün, Koyejo, Deng,
   Longpre, Smith, Ermis (and coauthors) critiquing Chatbot Arena, what exact
   assumptions and procedure are used in the best-of-N / selective-disclosure
   simulation (including the distributional setup for variant “true” scores and
   the number of simulation runs), and what quantitative uplift in the expected
   maximum discovered score is reported for N = 10 (relative to the
   no-private-testing baseline)?

2. Using the paper’s scraped sampling-rate analysis (the table that lists
   per-model maximum daily exposure), how does the paper define (a) model
   sampling rate and (b) a provider’s maximum sampling rate; and which single
   model attains the overall highest observed daily sampling rate in the study
   window (provide the model name, provider, date, and percentage), as well as
   which single model attains the overall lowest (same fields)?

3. In the paper’s silent model deprecation analysis, what exact time window is
   used, what explicit threshold rule is used to label a model “silently
   deprecated,” and what are the paper’s reported silent-deprecation rates for
   open-weight and open-source models (exact percentages)? Additionally, for
   the officially deprecated set, what percentage is proprietary vs.
   open-weight (exact percentages)?
`;

const { text } = await generateText({
  model: "gpt-5.2",
  prompt: PROMPT,
  tools: {
    search: searchTool({
      storeIdentifiers: [storeIdentifier],
      topK: 5,
    })
  },
  stopWhen: stepCountIs(10),
});

console.log(text);
