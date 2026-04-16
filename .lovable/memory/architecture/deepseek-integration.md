---
name: DeepSeek Integration with Prefix Caching
description: generate-content uses DeepSeek Reasoner with automatic prefix caching, Lovable AI as fallback
type: feature
---
- DeepSeek API (`deepseek-reasoner` model) is the primary AI for content generation
- Lovable AI Gateway (`google/gemini-2.5-pro`) is the fallback if DEEPSEEK_API_KEY is not set
- Prompt structure is cache-optimized: static system prompt (book context, rules) is the PREFIX → cached automatically by DeepSeek
- Variable content (chapter/subsection details, previous content) goes in the user message → not cached
- DeepSeek reasoner streams `reasoning_content` + `content`; edge function filters out reasoning tokens before forwarding
- Cache pricing: hit $0.03/M, miss $0.30/M, output $0.50/M
- Cache hits require identical prefix from the first token; system prompt must be deterministic per book
