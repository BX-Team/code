const russian = new Intl.PluralRules('ru');

export default defineI18nConfig(() => ({
  fallbackLocale: 'en',
  // Russian has three plural forms, written in this order: "1 участник | 2 участника | 5 участников".
  pluralRules: {
    ru: (choice: number) => {
      const form = russian.select(choice);
      return form === 'one' ? 0 : form === 'few' ? 1 : 2;
    },
  },
}));
