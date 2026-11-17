# Keycloak login theme `pdfe`

`login/template.ftl` is Keycloak 26.8.2's own template with one change: the bilingual simulation banner at the top of `<body>`, so every login page shows it. The text lives in `login/messages/messages_{en,ar}.properties` and must equal `SIM_LABEL_EN` and `SIM_LABEL_AR` (`packages/platform-core/src/sim-label.ts`); a test checks that. Full token styling comes with the navigable-shells story.
