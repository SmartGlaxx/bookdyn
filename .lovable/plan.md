

## Plan: Upgrade Content Generation to Gemini 2.5 Pro

### Current Model Mapping
| Function | Current Model | New Model |
|---|---|---|
| `generate-content` | gemini-2.5-flash | **gemini-2.5-pro** |
| `rewrite-paragraph` | gemini-2.5-flash | **gemini-2.5-pro** |
| `generate-outline` | gemini-2.5-flash | gemini-2.5-flash (keep) |
| `summarize-content` | gemini-2.5-flash-lite | gemini-2.5-flash-lite (keep) |
| `generate-characters` | gemini-2.5-flash | gemini-2.5-flash (keep) |
| Image functions | gemini-3-pro-image | gemini-3-pro-image (keep) |

### Changes

#### 1. `supabase/functions/generate-content/index.ts`
- Change model from `google/gemini-2.5-flash` to `google/gemini-2.5-pro`
- This is the main prose generation function — Pro will produce richer, more nuanced writing

#### 2. `supabase/functions/rewrite-paragraph/index.ts`
- Change model from `google/gemini-2.5-flash` to `google/gemini-2.5-pro`
- Rewrites and guided writing (continue, improve, dialogue) benefit from Pro's superior prose quality

### What stays the same
- **Outlines** (`generate-outline`): Flash is fine — outlines are structural, not prose-heavy
- **Summaries** (`summarize-content`): Flash Lite is sufficient for condensing text
- **Characters** (`generate-characters`): Flash handles extraction and metadata well
- **Images/Covers**: Already on the image-specific model

### Trade-offs
- **Quality**: Noticeably better dialogue, vocabulary, and narrative flow
- **Speed**: ~2-3x slower per request (Pro thinks deeper)
- **Cost**: ~3-5x more per request for content generation
- Outlines and summaries remain cheap and fast

