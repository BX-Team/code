import type { APIEmbed } from 'discord-api-types/v10';

export const COLORS = {
  brand: 0x00bcc5,
  success: 0x57f287,
  warning: 0xfee75c,
  error: 0xed4245,
} as const;

export interface EmbedOptions {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: string;
  thumbnail?: string;
  author?: { name: string; iconURL?: string; url?: string };
  timestamp?: boolean;
}

export function createEmbed(options: EmbedOptions = {}): APIEmbed {
  const embed: APIEmbed = { color: options.color ?? COLORS.brand };

  if (options.title) embed.title = options.title;
  if (options.description) embed.description = options.description;
  if (options.url) embed.url = options.url;
  if (options.thumbnail) embed.thumbnail = { url: options.thumbnail };
  if (options.footer) embed.footer = { text: options.footer };
  if (options.fields?.length) embed.fields = options.fields;
  if (options.timestamp !== false) embed.timestamp = new Date().toISOString();

  if (options.author) {
    embed.author = {
      name: options.author.name,
      icon_url: isHttpUrl(options.author.iconURL) ? options.author.iconURL : undefined,
      url: isHttpUrl(options.author.url) ? options.author.url : undefined,
    };
  }

  return embed;
}

export const errorEmbed = (options: EmbedOptions) => createEmbed({ ...options, color: COLORS.error });
export const successEmbed = (options: EmbedOptions) => createEmbed({ ...options, color: COLORS.success });

function isHttpUrl(value: string | undefined): value is string {
  return typeof value === 'string' && (value.startsWith('https://') || value.startsWith('http://'));
}
