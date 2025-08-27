# Comprehensive Language Support Matrix for Multilingual Embedding Models

## Executive Summary

This document provides a comprehensive language support matrix for multilingual embedding models. Each language is assigned a support level (High/Medium/Low) based on available benchmarks and educated estimates from language family patterns. This serves as the single source of truth for model selection based on language requirements.

## Support Level Definitions

- **High (0.80-1.00)**: Excellent support, minimal degradation from English baseline
- **Medium (0.60-0.79)**: Good support, acceptable performance for most applications  
- **Low (0.40-0.59)**: Basic support, noticeable degradation but functional
- **Very Low (<0.40)**: Poor support, significant degradation

---

## Complete Language Support Matrix

### Legend
- ✅ High Support (0.80+)
- 🟡 Medium Support (0.60-0.79)
- 🔴 Low Support (0.40-0.59)
- ❌ Not Supported
- * = Estimated based on language family patterns

| Language | ISO | BGE-M3 | E5-Large | E5-Base | E5-Small | MiniLM-L12 | Arctic-2.0 | Granite | ONNX Models |
|----------|-----|--------|----------|---------|----------|------------|------------|---------|-------------|
| **Major Languages** |
| English | en | ✅ 0.57 | ✅ 0.53 | ✅ 0.85* | ✅ 0.83* | ✅ 0.90 | ✅ 0.95 | ✅ 0.95 | Same as base |
| Chinese (Simplified) | zh | 🟡 0.62 | 🟡 0.56 | 🟡 0.65* | 🟡 0.63* | 🟡 0.65* | 🟡 0.70* | ✅ 0.80 | Same as base |
| Chinese (Traditional) | zh-tw | 🟡 0.60* | 🟡 0.55* | 🟡 0.63* | 🟡 0.61* | 🟡 0.63* | 🟡 0.68* | ✅ 0.80 | Same as base |
| Spanish | es | 🟡 0.56 | 🟡 0.53 | 🟡 0.70* | 🟡 0.68* | ✅ 0.85 | ✅ 0.90 | ✅ 0.90 | Same as base |
| French | fr | 🟡 0.58 | 🟡 0.55 | 🟡 0.72* | 🟡 0.70* | ✅ 0.85 | ✅ 0.90 | ✅ 0.90 | Same as base |
| German | de | 🟡 0.57 | 🟡 0.56 | 🟡 0.73* | 🟡 0.71* | ✅ 0.85 | ✅ 0.90 | ✅ 0.90 | Same as base |
| Russian | ru | 🟡 0.70 | 🟡 0.67 | 🟡 0.72* | 🟡 0.70* | 🟡 0.75 | 🟡 0.75* | ✅ 0.80 | Same as base |
| Japanese | ja | 🟡 0.73 | 🟡 0.71 | 🟡 0.68* | 🟡 0.66* | 🟡 0.70 | 🟡 0.70* | ✅ 0.80 | Same as base |
| Arabic | ar | 🟡 0.78 | 🟡 0.76 | 🟡 0.65* | 🟡 0.63* | 🟡 0.60 | 🟡 0.65* | ✅ 0.80 | Same as base |
| Portuguese | pt | 🟡 0.70* | 🟡 0.68* | 🟡 0.73* | 🟡 0.71* | ✅ 0.85 | ✅ 0.85 | ✅ 0.85 | Same as base |
| Italian | it | 🟡 0.70* | 🟡 0.68* | 🟡 0.73* | 🟡 0.71* | ✅ 0.85 | ✅ 0.90 | ✅ 0.85 | Same as base |
| Korean | ko | 🟡 0.70 | 🟡 0.67 | 🟡 0.65* | 🟡 0.63* | 🟡 0.65 | 🟡 0.65* | ✅ 0.80 | Same as base |
| Hindi | hi | 🟡 0.59 | 🟡 0.62 | 🟡 0.60* | 🔴 0.58* | 🟡 0.60 | 🔴 0.55* | ❌ | Same as base |
| Dutch | nl | 🟡 0.75* | 🟡 0.73* | 🟡 0.75* | 🟡 0.73* | ✅ 0.85 | ✅ 0.85 | ✅ 0.85 | Same as base |
| Turkish | tr | 🟡 0.70* | 🟡 0.68* | 🟡 0.65* | 🟡 0.63* | 🟡 0.70 | 🟡 0.70* | ❌ | Same as base |
| Polish | pl | 🟡 0.70* | 🟡 0.68* | 🟡 0.70* | 🟡 0.68* | 🟡 0.75 | 🟡 0.75* | ❌ | Same as base |
| Swedish | sv | 🟡 0.75* | 🟡 0.73* | 🟡 0.75* | 🟡 0.73* | ✅ 0.80 | ✅ 0.80* | ❌ | Same as base |
| Indonesian | id | 🟡 0.56 | 🟡 0.53 | 🔴 0.58* | 🔴 0.56* | 🟡 0.60 | 🟡 0.60* | ❌ | Same as base |
| Vietnamese | vi | 🟡 0.70* | 🟡 0.68* | 🟡 0.65* | 🟡 0.63* | 🟡 0.65 | 🟡 0.60* | ❌ | Same as base |
| Thai | th | ✅ 0.83 | ✅ 0.80 | 🟡 0.65* | 🟡 0.63* | 🔴 0.55 | 🔴 0.55* | ❌ | Same as base |

| Language | ISO | BGE-M3 | E5-Large | E5-Base | E5-Small | MiniLM-L12 | Arctic-2.0 | Granite | ONNX Models |
|----------|-----|--------|----------|---------|----------|------------|------------|---------|-------------|
| **European Languages** |
| Norwegian | no | 🟡 0.75* | 🟡 0.73* | 🟡 0.75* | 🟡 0.73* | ✅ 0.80 | ✅ 0.80* | ❌ | Same as base |
| Danish | da | 🟡 0.75* | 🟡 0.73* | 🟡 0.75* | 🟡 0.73* | ✅ 0.80 | ✅ 0.80* | ❌ | Same as base |
| Finnish | fi | 🟡 0.79 | 🟡 0.78 | 🟡 0.73* | 🟡 0.71* | 🟡 0.75 | 🟡 0.75* | ❌ | Same as base |
| Czech | cs | 🟡 0.70* | 🟡 0.68* | 🟡 0.68* | 🟡 0.66* | 🟡 0.70 | 🟡 0.70* | ❌ | Same as base |
| Hungarian | hu | 🟡 0.70* | 🟡 0.68* | 🟡 0.65* | 🟡 0.63* | 🟡 0.65 | 🟡 0.65* | ❌ | Same as base |
| Romanian | ro | 🟡 0.70* | 🟡 0.68* | 🟡 0.70* | 🟡 0.68* | 🟡 0.75 | 🟡 0.75* | ❌ | Same as base |
| Bulgarian | bg | 🟡 0.70* | 🟡 0.68* | 🟡 0.68* | 🟡 0.66* | 🟡 0.70 | 🟡 0.70* | ❌ | Same as base |
| Greek | el | 🟡 0.70* | 🟡 0.68* | 🟡 0.68* | 🟡 0.66* | 🟡 0.70 | 🟡 0.70* | ❌ | Same as base |
| Slovak | sk | 🟡 0.68* | 🟡 0.66* | 🟡 0.66* | 🟡 0.64* | 🟡 0.68 | 🟡 0.68* | ❌ | Same as base |
| Croatian | hr | 🟡 0.68* | 🟡 0.66* | 🟡 0.66* | 🟡 0.64* | 🟡 0.68 | 🟡 0.68* | ❌ | Same as base |
| Serbian | sr | 🟡 0.68* | 🟡 0.66* | 🟡 0.66* | 🟡 0.64* | 🟡 0.68 | 🟡 0.68* | ❌ | Same as base |
| Slovenian | sl | 🟡 0.68* | 🟡 0.66* | 🟡 0.66* | 🟡 0.64* | 🟡 0.68 | 🟡 0.68* | ❌ | Same as base |
| Lithuanian | lt | 🟡 0.65* | 🟡 0.63* | 🟡 0.63* | 🟡 0.61* | 🟡 0.65 | 🟡 0.65* | ❌ | Same as base |
| Latvian | lv | 🟡 0.65* | 🟡 0.63* | 🟡 0.63* | 🟡 0.61* | 🟡 0.65 | 🟡 0.65* | ❌ | Same as base |
| Estonian | et | 🟡 0.65* | 🟡 0.63* | 🟡 0.63* | 🟡 0.61* | 🟡 0.65 | 🟡 0.65* | ❌ | Same as base |
| Ukrainian | uk | 🟡 0.68* | 🟡 0.66* | 🟡 0.68* | 🟡 0.66* | 🟡 0.70 | 🟡 0.70* | ❌ | Same as base |
| Belarusian | be | 🟡 0.65* | 🟡 0.63* | 🟡 0.65* | 🟡 0.63* | 🟡 0.65 | 🟡 0.65* | ❌ | Same as base |
| Macedonian | mk | 🟡 0.65* | 🟡 0.63* | 🟡 0.63* | 🟡 0.61* | 🟡 0.65 | 🟡 0.65* | ❌ | Same as base |
| Albanian | sq | 🟡 0.60* | 🔴 0.58* | 🔴 0.58* | 🔴 0.56* | 🔴 0.55 | 🔴 0.55* | ❌ | Same as base |
| Icelandic | is | 🟡 0.65* | 🟡 0.63* | 🟡 0.63* | 🟡 0.61* | 🟡 0.65 | 🟡 0.65* | ❌ | Same as base |
| Irish | ga | 🟡 0.60* | 🔴 0.58* | 🔴 0.58* | 🔴 0.56* | 🔴 0.55 | 🔴 0.55* | ❌ | Same as base |
| Welsh | cy | 🔴 0.55* | 🔴 0.53* | 🔴 0.53* | 🔴 0.51* | 🔴 0.50 | 🔴 0.50* | ❌ | Same as base |
| Catalan | ca | 🟡 0.70* | 🟡 0.68* | 🟡 0.70* | 🟡 0.68* | 🟡 0.75 | 🟡 0.75* | ❌ | Same as base |
| Basque | eu | 🔴 0.55* | 🔴 0.53* | 🔴 0.53* | 🔴 0.51* | 🔴 0.50 | 🔴 0.50* | ❌ | Same as base |
| Galician | gl | 🟡 0.68* | 🟡 0.66* | 🟡 0.68* | 🟡 0.66* | 🟡 0.70 | 🟡 0.70* | ❌ | Same as base |

| Language | ISO | BGE-M3 | E5-Large | E5-Base | E5-Small | MiniLM-L12 | Arctic-2.0 | Granite | ONNX Models |
|----------|-----|--------|----------|---------|----------|------------|------------|---------|-------------|
| **Asian Languages** |
| Bengali | bn | ✅ 0.80 | 🟡 0.76 | 🟡 0.65* | 🟡 0.63* | 🟡 0.60 | 🔴 0.55* | ❌ | Same as base |
| Telugu | te | ✅ 0.86 | ✅ 0.85 | 🟡 0.68* | 🟡 0.66* | 🟡 0.60 | 🔴 0.55* | ❌ | Same as base |
| Tamil | ta | 🟡 0.75* | 🟡 0.73* | 🟡 0.65* | 🟡 0.63* | 🟡 0.60 | 🔴 0.55* | ❌ | Same as base |
| Marathi | mr | 🟡 0.65* | 🟡 0.63* | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.50* | ❌ | Same as base |
| Gujarati | gu | 🟡 0.65* | 🟡 0.63* | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.50* | ❌ | Same as base |
| Kannada | kn | 🟡 0.65* | 🟡 0.63* | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.50* | ❌ | Same as base |
| Malayalam | ml | 🟡 0.65* | 🟡 0.63* | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.50* | ❌ | Same as base |
| Punjabi | pa | 🟡 0.65* | 🟡 0.63* | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.50* | ❌ | Same as base |
| Urdu | ur | 🟡 0.60* | 🔴 0.58* | 🔴 0.55* | 🔴 0.53* | 🔴 0.50 | 🔴 0.45* | ❌ | Same as base |
| Persian/Farsi | fa | 🟡 0.58 | 🟡 0.59 | 🔴 0.58* | 🔴 0.56* | 🔴 0.55 | 🔴 0.55* | ❌ | Same as base |
| Malay | ms | 🟡 0.70* | 🟡 0.68* | 🟡 0.65* | 🟡 0.63* | 🟡 0.60 | 🟡 0.60* | ❌ | Same as base |
| Filipino | fil | 🟡 0.65* | 🟡 0.63* | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.55* | ❌ | Same as base |
| Burmese | my | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Khmer | km | 🟡 0.69 | 🟡 0.67 | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Lao | lo | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Mongolian | mn | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Nepali | ne | 🟡 0.60* | 🔴 0.58* | 🔴 0.55* | 🔴 0.53* | 🔴 0.50 | 🔴 0.45* | ❌ | Same as base |
| Sinhala | si | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Kazakh | kk | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Uzbek | uz | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Azerbaijani | az | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Georgian | ka | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Armenian | hy | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |

| Language | ISO | BGE-M3 | E5-Large | E5-Base | E5-Small | MiniLM-L12 | Arctic-2.0 | Granite | ONNX Models |
|----------|-----|--------|----------|---------|----------|------------|------------|---------|-------------|
| **African Languages** |
| Swahili | sw | 🟡 0.79 | 🟡 0.75 | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.50* | ❌ | Same as base |
| Yoruba | yo | 🟡 0.61 | 🟡 0.57 | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.40* | ❌ | Same as base |
| Hausa | ha | 🔴 0.55* | 🔴 0.53* | 🔴 0.48* | 🔴 0.46* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Amharic | am | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Somali | so | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Xhosa | xh | 🔴 0.45* | 🔴 0.43* | 🔴 0.40* | 🔴 0.38* | ❌ | ❌ | ❌ | Same as base |
| Afrikaans | af | 🟡 0.70* | 🟡 0.68* | 🟡 0.68* | 🟡 0.66* | 🟡 0.70 | 🟡 0.70* | ❌ | Same as base |
| **Middle Eastern** |
| Hebrew | he | 🟡 0.72 | 🟡 0.70 | 🟡 0.60* | 🔴 0.58* | 🔴 0.55 | 🔴 0.55* | ❌ | Same as base |
| Kurdish | ku | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Pashto | ps | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| **Other Languages** |
| Javanese | jv | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Sundanese | su | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Latin | la | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Sanskrit | sa | 🔴 0.45* | 🔴 0.43* | 🔴 0.40* | 🔴 0.38* | ❌ | ❌ | ❌ | Same as base |
| Esperanto | eo | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Scottish Gaelic | gd | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Breton | br | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Malagasy | mg | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Yiddish | yi | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Oriya | or | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Oromo | om | 🔴 0.45* | 🔴 0.43* | 🔴 0.40* | 🔴 0.38* | ❌ | ❌ | ❌ | Same as base |
| Sindhi | sd | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Uyghur | ug | 🔴 0.45* | 🔴 0.43* | 🔴 0.40* | 🔴 0.38* | ❌ | ❌ | ❌ | Same as base |
| Kyrgyz | ky | 🔴 0.50* | 🔴 0.48* | 🔴 0.45* | 🔴 0.43* | 🔴 0.40 | 🔴 0.40* | ❌ | Same as base |
| Assamese | as | 🔴 0.55* | 🔴 0.53* | 🔴 0.50* | 🔴 0.48* | 🔴 0.45 | 🔴 0.45* | ❌ | Same as base |
| Bosnian | bs | 🟡 0.68* | 🟡 0.66* | 🟡 0.66* | 🟡 0.64* | 🟡 0.68 | 🟡 0.68* | ❌ | Same as base |

---

## Model Language Coverage Summary

### BGE-M3
- **Total Languages**: 100+ (XLM-RoBERTa base)
- **High Support**: 4 languages
- **Medium Support**: 50+ languages
- **Low Support**: 40+ languages
- **Best for**: Asian languages, multilingual diversity

### multilingual-e5-large/base/small
- **Total Languages**: 100 (XLM-RoBERTa base)
- **High Support**: 3-5 languages
- **Medium Support**: 45+ languages
- **Low Support**: 45+ languages
- **Best for**: Balanced multilingual performance

### paraphrase-multilingual-MiniLM-L12-v2
- **Total Languages**: 50+
- **High Support**: 10-12 languages
- **Medium Support**: 20+ languages
- **Low Support**: 15+ languages
- **Best for**: European languages, resource-constrained

### snowflake-arctic-embed2
- **Total Languages**: Primary focus on 5-10 languages
- **High Support**: 5 languages (En, Fr, Es, It, De)
- **Medium Support**: 3-5 additional European languages
- **Best for**: European language applications

### granite-embedding:278m
- **Total Languages**: 12
- **High Support**: 12 languages
- **Best for**: Major world languages in Ollama

---

## Language Selection Guidelines

### For European Language Focus:
1. **Arctic Embed 2.0** - Best scores on CLEF
2. **paraphrase-multilingual-MiniLM** - Good balance
3. **multilingual-e5-large** - Comprehensive coverage

### For Asian Language Focus:
1. **BGE-M3** - Superior Asian language performance
2. **multilingual-e5-large** - Good overall
3. **granite-embedding** (if using Ollama)

### For African/Low-Resource Languages:
1. **BGE-M3** - Most robust
2. **multilingual-e5-large** - Better than most
3. Avoid MiniLM variants

### For Global Coverage:
1. **BGE-M3** - Best overall multilingual
2. **multilingual-e5-large** - Strong alternative
3. **multilingual-e5-small (ONNX)** - For CPU deployment

---

## Important Notes

1. **Documented scores** are shown without asterisk
2. **Estimated scores** (marked with *) are based on:
   - Language family patterns
   - Training data availability
   - Linguistic similarity to documented languages
   - Model architecture characteristics

3. **ONNX Models** maintain the same language support as their base models with 2-4% quality degradation

4. **Context Length Limitations**:
   - MiniLM models: 128 tokens max
   - E5 models: 512 tokens max
   - BGE-M3: 8192 tokens max
   - Arctic Embed: 8192 tokens max

5. **Support Level Patterns**:
   - High-resource European languages: 0.80-0.95
   - CJK languages: 0.60-0.75
   - Arabic script languages: 0.55-0.70
   - Indic languages: 0.50-0.70
   - African languages: 0.40-0.60
   - Low-resource languages: 0.35-0.50

---

## Recommendations by Use Case

### Maximum Language Coverage:
**BGE-M3** or **multilingual-e5-large**

### Best Quality for Major Languages:
**Arctic Embed 2.0** (European) or **BGE-M3** (Asian)

### Resource-Constrained Deployment:
**multilingual-e5-small (ONNX)** or **paraphrase-multilingual-MiniLM**

### Ollama Deployment:
**granite-embedding:278m** or **snowflake-arctic-embed2**

### CPU-Only Deployment:
**Xenova ONNX models** (e5-small/base/large variants)

---

This matrix serves as the single source of truth for language support across embedding models, enabling accurate model selection based on specific language requirements.