import { Timestamp } from 'firebase/firestore';

export interface Filter {
  id?: string; // Firestore document id
  name: string;
  category: string; // category document ID (reference to categories collection)
  subcategory?: string; // optional subcategory document ID (reference to subcategories collection)
  thumb_128: string; // public URL
  tags?: string[];
  prompt: string;
  isPro: boolean;
  popularity: number;
  order: number;
  visible: boolean;
  supports_reference_images?: boolean; // whether this filter supports reference images
  max_reference_images?: number; // maximum number of reference images (1, 2, or 3)
  updatedAt?: Timestamp; // set by server
}

export interface Category {
	id?: string; // Firestore document id
	name: string;
	slug: string; // lowercase identifier
	cover_image?: string;
	description?: string;
	order: number;
	visible: boolean;
	hasSubcategories?: boolean; // indicates if this category has subcategories
	tags?: string[];
	updatedAt?: Timestamp; // set by server
}

export interface Subcategory {
	id?: string; // Firestore document id
	name: string;
	slug: string; // lowercase identifier
	parentCategoryId: string; // reference to parent category
	cover_image?: string;
	description?: string;
	order: number;
	visible: boolean;
	tags?: string[];
	updatedAt?: Timestamp; // set by server
}

