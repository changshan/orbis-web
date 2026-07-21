const language = (navigator.languages?.[0] ?? navigator.language ?? "en").toLowerCase();
location.replace(language.startsWith("zh") ? "/zh/" : "/en/");
