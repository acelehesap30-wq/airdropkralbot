/**
 * Blueprint: NFT smart contract schemas — 6 collection types
 * Zod validation for on-chain metadata shared between mint, reveal, and marketplace.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// NFT Collection types — canonical list from blueprint
// ---------------------------------------------------------------------------

export const NFT_COLLECTION_TYPES = [
  'arena_badge',
  'season_trophy',
  'quest_relic',
  'pvp_champion',
  'chest_legendary',
  'genesis_pass',
] as const;

export type NftCollectionType = (typeof NFT_COLLECTION_TYPES)[number];

// ---------------------------------------------------------------------------
// Shared attribute schema
// ---------------------------------------------------------------------------

export const NftAttributeSchema = z.object({
  trait_type: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean()]),
  display_type: z.enum(['string', 'number', 'boost_number', 'boost_percentage', 'date']).optional(),
});

export type NftAttribute = z.infer<typeof NftAttributeSchema>;

// ---------------------------------------------------------------------------
// Base NFT metadata (ERC-721 / TON NFT compatible)
// ---------------------------------------------------------------------------

export const NftMetadataBaseSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(2048),
  image: z.string().url(),
  external_url: z.string().url().optional(),
  animation_url: z.string().url().optional(),
  attributes: z.array(NftAttributeSchema).min(1),
  collection: z.enum(NFT_COLLECTION_TYPES),
});

export type NftMetadataBase = z.infer<typeof NftMetadataBaseSchema>;

// ---------------------------------------------------------------------------
// Per-collection schemas with collection-specific attributes
// ---------------------------------------------------------------------------

export const ArenaBadgeSchema = NftMetadataBaseSchema.extend({
  collection: z.literal('arena_badge'),
  attributes: z.array(NftAttributeSchema).min(1).refine(
    (attrs) => attrs.some((a) => a.trait_type === 'tier'),
    { message: 'arena_badge must have a "tier" attribute' },
  ),
});

export const SeasonTrophySchema = NftMetadataBaseSchema.extend({
  collection: z.literal('season_trophy'),
  attributes: z.array(NftAttributeSchema).min(2).refine(
    (attrs) =>
      attrs.some((a) => a.trait_type === 'season') &&
      attrs.some((a) => a.trait_type === 'rank'),
    { message: 'season_trophy requires "season" and "rank" attributes' },
  ),
});

export const QuestRelicSchema = NftMetadataBaseSchema.extend({
  collection: z.literal('quest_relic'),
  attributes: z.array(NftAttributeSchema).min(1).refine(
    (attrs) => attrs.some((a) => a.trait_type === 'quest_chain'),
    { message: 'quest_relic must have a "quest_chain" attribute' },
  ),
});

export const PvpChampionSchema = NftMetadataBaseSchema.extend({
  collection: z.literal('pvp_champion'),
  attributes: z.array(NftAttributeSchema).min(2).refine(
    (attrs) =>
      attrs.some((a) => a.trait_type === 'elo_peak') &&
      attrs.some((a) => a.trait_type === 'wins'),
    { message: 'pvp_champion requires "elo_peak" and "wins" attributes' },
  ),
});

export const ChestLegendarySchema = NftMetadataBaseSchema.extend({
  collection: z.literal('chest_legendary'),
  attributes: z.array(NftAttributeSchema).min(1).refine(
    (attrs) => attrs.some((a) => a.trait_type === 'rarity'),
    { message: 'chest_legendary must have a "rarity" attribute' },
  ),
});

export const GenesisPassSchema = NftMetadataBaseSchema.extend({
  collection: z.literal('genesis_pass'),
  attributes: z.array(NftAttributeSchema).min(1).refine(
    (attrs) => attrs.some((a) => a.trait_type === 'pass_number'),
    { message: 'genesis_pass must have a "pass_number" attribute' },
  ),
});

// ---------------------------------------------------------------------------
// Discriminated union of all 6 NFT types
// ---------------------------------------------------------------------------

export const NftMetadataSchema = z.discriminatedUnion('collection', [
  ArenaBadgeSchema,
  SeasonTrophySchema,
  QuestRelicSchema,
  PvpChampionSchema,
  ChestLegendarySchema,
  GenesisPassSchema,
]);

export type NftMetadata = z.infer<typeof NftMetadataSchema>;

// ---------------------------------------------------------------------------
// Mint request schema — what the bot/admin submits to the minting service
// ---------------------------------------------------------------------------

export const MintRequestSchema = z.object({
  collection: z.enum(NFT_COLLECTION_TYPES),
  recipient_address: z.string().min(1),
  recipient_chain: z.enum(['ton', 'eth', 'sol']),
  user_id: z.number().int().positive(),
  metadata: NftMetadataBaseSchema,
  idempotency_key: z.string().uuid(),
});

export type MintRequest = z.infer<typeof MintRequestSchema>;

// ---------------------------------------------------------------------------
// Mint result schema — returned after successful on-chain mint
// ---------------------------------------------------------------------------

export const MintResultSchema = z.object({
  success: z.boolean(),
  collection: z.enum(NFT_COLLECTION_TYPES),
  token_id: z.string().optional(),
  tx_hash: z.string().optional(),
  contract_address: z.string().optional(),
  chain: z.enum(['ton', 'eth', 'sol']),
  metadata_uri: z.string().url().optional(),
  minted_at: z.string().datetime({ offset: true }).optional(),
  error: z.string().optional(),
});

export type MintResult = z.infer<typeof MintResultSchema>;
