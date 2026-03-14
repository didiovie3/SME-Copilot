import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

// Ensure we have a default empty array if the JSON structure is unexpected
export const PlaceHolderImages: ImagePlaceholder[] = data?.placeholderImages || [];
