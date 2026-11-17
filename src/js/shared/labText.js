export function messagesFor(messages, language) {
  const column = language === 'en' ? 1 : 0;
  return (key, ...values) => messages[key][column].replace(/\{(\d+)\}/g, (_, position) => String(values[position]));
}
