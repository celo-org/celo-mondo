import { z } from 'zod';

export enum SocialLinkType {
  Website = 'website',
  Twitter = 'twitter',
  Github = 'github',
  Discord = 'discord',
}

export const SocialLinksSchema = z.record(z.nativeEnum(SocialLinkType), z.string().url());

export type SocialLinks = z.infer<typeof SocialLinksSchema>;
