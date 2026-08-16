import { EmbedBuilder } from '@discordjs/builders';

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

export function createEmbed(options: EmbedOptions = {}): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(options.color ?? COLORS.brand);

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.url) embed.setURL(options.url);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.fields?.length) embed.addFields(options.fields);
  if (options.timestamp !== false) embed.setTimestamp();

  if (options.author) {
    embed.setAuthor({
      name: options.author.name,
      iconURL: isHttpUrl(options.author.iconURL) ? options.author.iconURL : undefined,
      url: isHttpUrl(options.author.url) ? options.author.url : undefined,
    });
  }

  return embed;
}

export const errorEmbed = (options: EmbedOptions) => createEmbed({ ...options, color: COLORS.error });
export const successEmbed = (options: EmbedOptions) => createEmbed({ ...options, color: COLORS.success });

function isHttpUrl(value: string | undefined): value is string {
  return typeof value === 'string' && (value.startsWith('https://') || value.startsWith('http://'));
}
