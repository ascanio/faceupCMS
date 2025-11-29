import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCAl50ojHbMKAwrYXkOPnZpvahc5yJamd8',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'faceup-d022b.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'faceup-d022b',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'faceup-d022b.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '593079427925',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:593079427925:web:fc854d1b6cf3bc8146c5dc',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const promptCategoriesData = [
  {
    "id": "subject",
    "name": "Subject Rules",
    "icon": "person.crop.circle",
    "order": 1,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "portrait", "stability"],
    "options": [
      {
        "id": "preserve_identity",
        "label": "Preserve Identity Exactly",
        "value": "preserve the subject's identity exactly, keeping all unique facial features and proportions unchanged.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "portrait", "stability"]
      },
      {
        "id": "keep_pose_angle",
        "label": "Keep Pose & Angle",
        "value": "keep the original pose, body posture, and head angle unchanged.",
        "order": 2,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "portrait", "stability"]
      },
      {
        "id": "keep_expression",
        "label": "Keep Expression",
        "value": "keep the same facial expression without exaggeration or dramatic change.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "portrait", "stability"]
      },
      {
        "id": "keep_hairstyle",
        "label": "Keep Hairstyle",
        "value": "keep the hairstyle, haircut shape, and hair arrangement exactly the same.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "portrait"]
      },
      {
        "id": "keep_clothing",
        "label": "Keep Clothing",
        "value": "keep the outfit and clothing exactly the same without any changes.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "portrait", "branding"]
      },
      {
        "id": "clean_face_edges",
        "label": "Ultra Clean Face Boundaries",
        "value": "ensure ultra clean face boundaries with no melting, stretching, or distortions.",
        "order": 6,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "portrait", "stability"]
      },
      {
        "id": "isolate_subject",
        "label": "Isolate the Subject",
        "value": "make the subject clearly isolated and crisply separated from the background.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "portrait", "cinematic"]
      },
      {
        "id": "no_extra_people",
        "label": "No Extra People / Reflections",
        "value": "do not add extra people, silhouettes, or ghost reflections in the scene.",
        "order": 8,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "stability"]
      }
    ]
  },
  {
    "id": "camera",
    "name": "Camera",
    "icon": "camera.aperture",
    "order": 2,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "cinematic", "technical"],
    "options": [
      {
        "id": "cam_85mm_editorial",
        "label": "85mm Editorial Portrait",
        "value": "85mm portrait lens, close-up editorial framing with creamy perspective.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "portrait", "fashion", "beauty"]
      },
      {
        "id": "cam_35mm_street",
        "label": "35mm Street Lens",
        "value": "35mm lens with a candid street-style perspective, showing some environment around the subject.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "ugc", "tiktok", "street"]
      },
      {
        "id": "cam_50mm_natural",
        "label": "50mm Natural Human View",
        "value": "50mm lens for a natural, cinematic framing similar to human vision.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "portrait", "cinematic"]
      },
      {
        "id": "cam_24mm_wide",
        "label": "24mm Wide Environmental",
        "value": "24mm wide-angle lens capturing more of the environment with a dynamic, modern vlog feel.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "ugc", "tiktok", "wide"]
      },
      {
        "id": "cam_100mm_macro",
        "label": "100mm Macro Beauty",
        "value": "100mm macro lens focusing on hyper-detailed beauty close-ups with sharp micro-texture.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "macro"]
      },
      {
        "id": "cam_tele_compression",
        "label": "Telephoto Compression",
        "value": "telephoto-style compression with a gently flattened background for a luxury feel.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "luxury"]
      },
      {
        "id": "cam_f14_dreamy",
        "label": "F/1.4 Dreamy Depth",
        "value": "shot at f/1.4 with ultra shallow depth of field and dreamy, creamy bokeh.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "aesthetic", "bokeh"]
      },
      {
        "id": "cam_f28_editorial",
        "label": "F/2.8 Balanced Editorial",
        "value": "shot around f/2.8 for a balanced editorial sharpness with gentle background blur.",
        "order": 8,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "portrait", "fashion", "clean"]
      },
      {
        "id": "cam_low_angle_hero",
        "label": "Low-Angle Hero Shot",
        "value": "low-angle hero shot that makes the subject feel powerful and confident.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic", "hero"]
      },
      {
        "id": "cam_eye_level_soft",
        "label": "Eye-Level Soft Portrait",
        "value": "eye-level perspective for an honest, intimate portrait view.",
        "order": 10,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "portrait", "beauty", "clean"]
      }
    ]
  },
  {
    "id": "lighting",
    "name": "Lighting",
    "icon": "sun.max",
    "order": 3,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "cinematic"],
    "options": [
      {
        "id": "light_soft_window",
        "label": "Soft Window Light",
        "value": "soft window light with airy, flattering illumination and gentle falloff.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "portrait", "beauty", "branding", "soft"]
      },
      {
        "id": "light_golden_hour",
        "label": "Golden Hour Glow",
        "value": "golden hour lighting with warm cinematic highlights and soft shadows.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic", "sunset", "aesthetic"]
      },
      {
        "id": "light_overcast",
        "label": "Overcast Diffused Light",
        "value": "overcast diffused light with no harsh shadows and calm, even illumination.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "portrait", "beauty", "clean"]
      },
      {
        "id": "light_moody_side",
        "label": "Moody Side Light",
        "value": "moody side lighting with strong directional shadows and cinematic depth.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic", "moody"]
      },
      {
        "id": "light_neon_mix",
        "label": "Neon Magenta/Cyan Mix",
        "value": "neon magenta and cyan mixed lighting for a cyber, nightlife aesthetic.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "tiktok", "ugc", "neon", "cyberpunk"]
      },
      {
        "id": "light_studio_softbox",
        "label": "Studio Softbox Clean",
        "value": "studio softbox lighting, crisp and even, perfect for high-end beauty shots.",
        "order": 6,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "portrait", "beauty", "fashion", "studio"]
      },
      {
        "id": "light_candle_warm",
        "label": "Candlelight Warmth",
        "value": "warm candle-style lighting with soft, intimate glow and gentle contrast.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic", "cozy"]
      },
      {
        "id": "light_hard_flash",
        "label": "Hard Shadow Fashion Flash",
        "value": "hard flash lighting with sharp shadows and punchy fashion contrast.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "fashion", "editorial", "flash"]
      },
      {
        "id": "light_backlit_halo",
        "label": "Backlit Halo",
        "value": "backlit halo glow behind the subject, highlighting hair and edges.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "aesthetic", "cinematic"]
      },
      {
        "id": "light_color_gel_soft",
        "label": "Soft Color-Gel Glow",
        "value": "soft color-gel lighting in peach, lilac, or pastel blue tones for a dreamy vibe.",
        "order": 10,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "aesthetic", "pastel"]
      }
    ]
  },
  {
    "id": "composition",
    "name": "Composition & Background",
    "icon": "square.grid.3x3",
    "order": 4,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video"],
    "options": [
      {
        "id": "comp_centered_symmetry",
        "label": "Centered Symmetry",
        "value": "centered symmetrical composition with clean modern balance.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "branding", "clean"]
      },
      {
        "id": "comp_rule_of_thirds",
        "label": "Rule-of-Thirds Lifestyle",
        "value": "rule-of-thirds framing for a natural lifestyle feel.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "lifestyle"]
      },
      {
        "id": "comp_ultra_close_face",
        "label": "Ultra Close Face Crop",
        "value": "ultra close crop on the face, focusing on eyes and facial details.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "portrait", "beauty"]
      },
      {
        "id": "comp_minimal_background",
        "label": "Minimal Clean Background",
        "value": "minimal, clean background with no distracting elements.",
        "order": 4,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "branding", "clean"]
      },
      {
        "id": "comp_foreground_depth",
        "label": "Foreground Depth Elements",
        "value": "foreground elements partially framing the subject for cinematic depth.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic"]
      },
      {
        "id": "comp_background_preserved",
        "label": "Perfect Background Preservation",
        "value": "preserve the original background exactly as in the input image.",
        "order": 6,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "stability"]
      },
      {
        "id": "comp_stable_zero_drift",
        "label": "Stable Zero Drift",
        "value": "keep the framing perfectly stable with zero drift or zoom between frames.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "stability"]
      },
      {
        "id": "comp_soft_bokeh_bg",
        "label": "Soft Bokeh Background",
        "value": "soft bokeh background with smooth, creamy blur.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "portrait", "aesthetic", "bokeh"]
      },
      {
        "id": "comp_high_detail_bg",
        "label": "High-Detail Backdrop",
        "value": "high-detail backdrop with clear textures and structure.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "environment"]
      }
    ]
  },
  {
    "id": "environment",
    "name": "Environment / Setting",
    "icon": "globe.europe.africa",
    "order": 5,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "aesthetic"],
    "options": [
      {
        "id": "env_streetwear_urban",
        "label": "Streetwear Urban Corner",
        "value": "urban streetwear corner with graffiti walls, concrete textures, and Gen-Z city energy.",
        "order": 1,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "ugc", "tiktok", "street"]
      },
      {
        "id": "env_paris_cafe",
        "label": "Parisian Café Exterior",
        "value": "Parisian café exterior with warm light, small tables, and a lifestyle coffee atmosphere.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "lifestyle", "aesthetic"]
      },
      {
        "id": "env_soft_studio_neutral",
        "label": "Soft Studio Neutral",
        "value": "soft studio setting with neutral beige or cream backdrop and minimal decor.",
        "order": 3,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "branding", "clean", "portrait"]
      },
      {
        "id": "env_forest_dappled",
        "label": "Forest Dappled Light",
        "value": "forest location with dappled sunlight filtering through leaves.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "nature"]
      },
      {
        "id": "env_nyc_sidewalk",
        "label": "NYC Sidewalk Energy",
        "value": "New York-style city sidewalk with subtle traffic, parked cars, and urban motion.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "ugc", "street"]
      },
      {
        "id": "env_arch_minimal",
        "label": "Clean Architectural Minimalism",
        "value": "clean architectural setting with straight lines, concrete, and modern minimal design.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "clean", "fashion"]
      },
      {
        "id": "env_cozy_indoor",
        "label": "Cozy Indoor Aesthetic",
        "value": "cozy indoor space with warm tones, soft decor, and subtle ambient lights.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "aesthetic", "cozy"]
      },
      {
        "id": "env_retro_90s",
        "label": "Retro 90s Room",
        "value": "retro 90s-style room with analog textures, posters, and nostalgic atmosphere.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "vintage", "nostalgia"]
      },
      {
        "id": "env_lux_modern",
        "label": "Luxury Modern Interior",
        "value": "luxury modern interior with clean lines, designer furniture, and calm lighting.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "luxury"]
      },
      {
        "id": "env_beach_sunset",
        "label": "Beach Sunset",
        "value": "sunset beach with soft waves, golden sky, and gentle reflections.",
        "order": 10,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "aesthetic"]
      }
    ]
  },
  {
    "id": "style",
    "name": "Style",
    "icon": "sparkles",
    "order": 6,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "aesthetic"],
    "options": [
      {
        "id": "style_editorial_beauty",
        "label": "Editorial Beauty",
        "value": "editorial beauty style with clean lines and high-fashion minimalism.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "portrait", "beauty", "fashion", "branding"]
      },
      {
        "id": "style_cinematic_film",
        "label": "Cinematic Film Look",
        "value": "cinematic film look with moody tones and subtle texture.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic", "film"]
      },
      {
        "id": "style_genz_candid",
        "label": "Gen-Z Candid",
        "value": "Gen-Z candid style with slightly imperfect, real-life energy.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "ugc", "tiktok"]
      },
      {
        "id": "style_analog_35mm",
        "label": "Analog 35mm",
        "value": "analog 35mm film aesthetic with visible grain and subtle imperfections.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "film", "vintage"]
      },
      {
        "id": "style_dreamy_pastel",
        "label": "Dreamy Pastel Aesthetic",
        "value": "dreamy pastel aesthetic with soft, airy colors and gentle highlights.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "aesthetic", "pastel"]
      },
      {
        "id": "style_cyberpunk_neon",
        "label": "Cyberpunk Neon",
        "value": "cyberpunk neon style with bold magenta and cyan highlights.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "neon", "cyberpunk"]
      },
      {
        "id": "style_influencer_lifestyle",
        "label": "Lifestyle Influencer",
        "value": "lifestyle influencer aesthetic with polished but relatable styling.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "ugc", "tiktok", "instagram", "branding"]
      },
      {
        "id": "style_kbeauty_clean",
        "label": "K-Beauty Clean Skin",
        "value": "K-beauty inspired clean skin, dewy luminosity, and soft glow.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "skin"]
      },
      {
        "id": "style_highfashion_glossy",
        "label": "High-Fashion Glossy",
        "value": "high-fashion glossy style with luxury commercial finish.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "fashion", "luxury", "branding"]
      },
      {
        "id": "style_soft_romantic",
        "label": "Soft Romantic Glow",
        "value": "soft romantic glow with warm tones and intimate mood.",
        "order": 10,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "aesthetic", "romantic"]
      }
    ]
  },
  {
    "id": "color",
    "name": "Color & Tonality",
    "icon": "paintpalette",
    "order": 7,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video"],
    "options": [
      {
        "id": "color_warm_skin",
        "label": "Warm Natural Skin Tones",
        "value": "warm natural skin tones that feel healthy and flattering.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "portrait", "beauty"]
      },
      {
        "id": "color_cool_cinema",
        "label": "Cool Cinematic Blues",
        "value": "cool cinematic palette with subtle blue and teal shadows.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic"]
      },
      {
        "id": "color_neutral_balanced",
        "label": "Balanced Neutrals",
        "value": "balanced neutral color grading that stays true to real-life colors.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "clean"]
      },
      {
        "id": "color_high_contrast",
        "label": "High-Contrast Fashion",
        "value": "high-contrast fashion look with punchy highlights and rich shadows.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "fashion", "editorial"]
      },
      {
        "id": "color_pastel_candy",
        "label": "Pastel Candy Tones",
        "value": "pastel candy color palette with soft pinks, mint, and lavender.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "aesthetic", "pastel"]
      },
      {
        "id": "color_moody_fade",
        "label": "Moody Fade",
        "value": "moody faded tonality with gently muted shadows and a matte finish.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic", "moody"]
      },
      {
        "id": "color_vintage_sepia",
        "label": "Vintage Sepia Touch",
        "value": "soft sepia-toned warmth for a nostalgic vintage feel.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "vintage", "film"]
      },
      {
        "id": "color_teal_orange",
        "label": "Teal & Orange Cinema",
        "value": "teal and orange cinematic grading with warm skin and cool backgrounds.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic"]
      },
      {
        "id": "color_desaturated_clean",
        "label": "Soft Desaturated Clean",
        "value": "softly desaturated colors for a calm, minimalist aesthetic.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "clean"]
      },
      {
        "id": "color_rich_pop",
        "label": "Rich Saturated Pop",
        "value": "rich saturated colors with bold, vibrant impact.",
        "order": 10,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "ugc", "tiktok"]
      }
    ]
  },
  {
    "id": "textures",
    "name": "Textures & Material Detail",
    "icon": "circle.lefthalf.filled",
    "order": 8,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "beauty"],
    "options": [
      {
        "id": "tex_natural_skin_micro",
        "label": "Natural Skin Micro-Detail",
        "value": "natural skin texture with visible pores and realistic micro-detail.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "beauty", "portrait"]
      },
      {
        "id": "tex_soft_editorial_skin",
        "label": "Soft Editorial Skin",
        "value": "soft editorial skin rendering, clean but never plastic or fake.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "fashion"]
      },
      {
        "id": "tex_subtle_film_grain",
        "label": "Subtle Film Grain",
        "value": "subtle fine film grain that adds texture without overpowering.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "film", "vintage"]
      },
      {
        "id": "tex_glossy_highlights",
        "label": "Premium Glossy Highlights",
        "value": "premium glossy highlights on skin and hair for a luminous look.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "fashion"]
      },
      {
        "id": "tex_matte_finish",
        "label": "Matte Smooth Finish",
        "value": "matte smooth finish with controlled shine and chic texture.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "branding"]
      },
      {
        "id": "tex_velvet_shadows",
        "label": "Velvet Soft Shadows",
        "value": "velvety soft shadows with rich yet gentle transitions.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic"]
      },
      {
        "id": "tex_glassy_eyes",
        "label": "Glassy Eye Detail",
        "value": "glassy, detailed eyes with crisp iris texture and natural reflections.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "portrait"]
      },
      {
        "id": "tex_hair_strands_detail",
        "label": "Ultra Hair Strand Detail",
        "value": "ultra-detailed individual hair strands with clean separation.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "fashion"]
      },
      {
        "id": "tex_fabric_linen_cotton",
        "label": "Fine Fabric Texture",
        "value": "fine fabric texture on clothing, clearly showing linen, cotton, or wool weave.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "fashion", "branding"]
      },
      {
        "id": "tex_soft_bokeh_texture",
        "label": "Soft Bokeh Texture",
        "value": "soft bokeh texture with smooth, dreamy circular highlights.",
        "order": 10,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "aesthetic", "bokeh"]
      }
    ]
  },
  {
    "id": "focus",
    "name": "Depth of Field & Focus",
    "icon": "viewfinder",
    "order": 9,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "cinematic"],
    "options": [
      {
        "id": "focus_ultra_shallow",
        "label": "Ultra Shallow DOF",
        "value": "ultra shallow depth of field so the subject pops against a dreamy blur.",
        "order": 1,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "bokeh"]
      },
      {
        "id": "focus_crisp_foreground",
        "label": "Crisp Foreground Focus",
        "value": "crisp foreground focus with razor-sharp eyes.",
        "order": 2,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "portrait", "beauty"]
      },
      {
        "id": "focus_soft_edge",
        "label": "Soft Edge Focus",
        "value": "soft edge focus where clarity gently fades toward the frame edges.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "aesthetic"]
      },
      {
        "id": "focus_deep_scene",
        "label": "Deep Focus Scene",
        "value": "deep focus so both subject and environment stay sharp.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "environment"]
      },
      {
        "id": "focus_foreground_blur",
        "label": "Foreground Blur Lens Effect",
        "value": "foreground blur lens effect with soft elements near the camera framing the subject.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic"]
      },
      {
        "id": "focus_creamy_bokeh",
        "label": "Creamy Bokeh Balls",
        "value": "creamy bokeh balls from lights in the background.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "aesthetic", "bokeh"]
      },
      {
        "id": "focus_macro_eyes",
        "label": "Macro Focus on Eyes",
        "value": "macro-style focus on the eyes with extreme iris detail.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "portrait", "macro"]
      },
      {
        "id": "focus_center_sharp",
        "label": "Center Sharp / Background Melted",
        "value": "center of the frame tack sharp while the background melts away.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "bokeh"]
      },
      {
        "id": "focus_film_soft_glow",
        "label": "Film Soft Focus Glow",
        "value": "film-style soft focus glow with a slight romantic blur.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "cinematic", "aesthetic", "film"]
      }
    ]
  },
  {
    "id": "transform",
    "name": "Transformation Rules",
    "icon": "wand.and.rays",
    "order": 10,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "stability"],
    "options": [
      {
        "id": "trans_subtle_skin",
        "label": "Subtle Skin Enhancement Only",
        "value": "apply only subtle skin enhancement without drastic changes.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "beauty", "portrait"]
      },
      {
        "id": "trans_light_beauty_retouch",
        "label": "Light Beauty Retouch",
        "value": "light beauty retouch that keeps the subject looking real and human.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "fashion"]
      },
      {
        "id": "trans_natural_rejuvenation",
        "label": "Natural Rejuvenation",
        "value": "natural rejuvenation that makes the subject look slightly fresher and rested.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "portrait"]
      },
      {
        "id": "trans_light_cleanup",
        "label": "Soft Lighting Cleanup",
        "value": "soft cleanup of uneven lighting or minor harsh shadows.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty"]
      },
      {
        "id": "trans_color_tone_only",
        "label": "Color Tone Correction Only",
        "value": "only adjust color and tonal balance without changing structure.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "clean"]
      },
      {
        "id": "trans_eye_brighten",
        "label": "Brighter Eyes (Realistic)",
        "value": "slightly brighten the eyes while keeping them realistic.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "portrait"]
      },
      {
        "id": "trans_boost_texture",
        "label": "Boost Texture Realism",
        "value": "boost realism of textures on skin, hair, and clothing.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "fashion"]
      },
      {
        "id": "trans_no_expression_change",
        "label": "No Expression Change",
        "value": "do not change or exaggerate the original facial expression.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "stability"]
      },
      {
        "id": "trans_no_hairline_change",
        "label": "No Hairline Change",
        "value": "do not modify or reposition the hairline.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "stability"]
      },
      {
        "id": "trans_no_cloth_bg_change",
        "label": "Clothing & Background Locked",
        "value": "keep clothing and background strictly unchanged.",
        "order": 10,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "stability"]
      }
    ]
  },
  {
    "id": "physics",
    "name": "Scene Logic & Physics",
    "icon": "cube",
    "order": 11,
    "visible": true,
    "multiSelect": true,
    "tags": ["video", "veo", "stability"],
    "options": [
      {
        "id": "phys_light_direction",
        "label": "Realistic Light & Shadows",
        "value": "ensure realistic light direction and physically correct shadows.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "stability"]
      },
      {
        "id": "phys_reflections",
        "label": "Consistent Reflections",
        "value": "maintain consistent reflections on glass, metal, and skin surfaces.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "cinematic"]
      },
      {
        "id": "phys_true_depth",
        "label": "True Physical Depth",
        "value": "render the scene with true physical depth and realistic spatial layering.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "cinematic"]
      },
      {
        "id": "phys_stable_perspective",
        "label": "Stable Perspective",
        "value": "keep perspective stable and avoid warped geometry.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "stability"]
      },
      {
        "id": "phys_grounded",
        "label": "Grounded Subject",
        "value": "ensure the subject feels grounded with natural contact to the floor or surface.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "stability"]
      },
      {
        "id": "phys_natural_motion",
        "label": "Natural Motion Physics",
        "value": "keep all motion physically believable with natural timing and weight.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "cinematic"]
      },
      {
        "id": "phys_zero_camera_drift",
        "label": "Zero Camera Drift",
        "value": "keep the camera perfectly stable with no unintended drift or shake.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "stability"]
      },
      {
        "id": "phys_background_anchored",
        "label": "Background Anchored",
        "value": "anchor the background so it does not wobble or slide.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "stability"]
      },
      {
        "id": "phys_material_behavior",
        "label": "Accurate Material Behavior",
        "value": "ensure materials like skin, fabric, and hair behave naturally during motion.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["video", "veo", "cinematic"]
      }
    ]
  },
  {
    "id": "negative",
    "name": "Negative Prompts",
    "icon": "xmark.octagon",
    "order": 12,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "stability"],
    "options": [
      {
        "id": "neg_no_distortion",
        "label": "No Distortion / Melting",
        "value": "no distortion, no melting, no warped faces or body parts.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "stability"]
      },
      {
        "id": "neg_no_plastic_skin",
        "label": "No Plastic Skin",
        "value": "no plastic, over-smoothed, or fake airbrushed skin.",
        "order": 2,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "beauty", "stability"]
      },
      {
        "id": "neg_no_extra_limbs",
        "label": "No Extra Limbs / Duplicates",
        "value": "no extra limbs, no duplicated faces, no cloned subjects.",
        "order": 3,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "stability"]
      },
      {
        "id": "neg_no_artifacts",
        "label": "No AI Artifacts",
        "value": "no AI artifacts, no glitchy edges, no strange patterns.",
        "order": 4,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "stability"]
      },
      {
        "id": "neg_no_blur_subject",
        "label": "No Blurry Important Areas",
        "value": "do not blur the subject's face or important details.",
        "order": 5,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "stability"]
      },
      {
        "id": "neg_no_harsh_hdr",
        "label": "No Harsh HDR Look",
        "value": "no harsh HDR, no over-sharpened or crunchy contrast.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video"]
      },
      {
        "id": "neg_no_oversmooth",
        "label": "No Oversmoothing",
        "value": "no oversmoothing that removes all skin texture.",
        "order": 7,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "beauty", "stability"]
      },
      {
        "id": "neg_no_color_fringe",
        "label": "No Color Fringing",
        "value": "no color fringing, no unnatural purple or green edges.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video"]
      },
      {
        "id": "neg_no_bad_shadows",
        "label": "No Unnatural Shadows",
        "value": "no unnatural shadows that break the lighting logic.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "stability"]
      },
      {
        "id": "neg_no_text_watermarks",
        "label": "No Text / Watermarks",
        "value": "no text, no captions, no logos, no watermarks in the image.",
        "order": 10,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "video", "branding", "stability"]
      }
    ]
  },
  {
    "id": "output",
    "name": "Output Quality",
    "icon": "checkmark.seal",
    "order": 13,
    "visible": true,
    "multiSelect": true,
    "tags": ["photo", "video", "professional"],
    "options": [
      {
        "id": "out_highend_photoreal",
        "label": "High-End Photorealistic",
        "value": "high-end photorealistic quality, comparable to a professional photo shoot.",
        "order": 1,
        "visible": true,
        "defaultSelected": true,
        "tags": ["photo", "professional", "branding"]
      },
      {
        "id": "out_editorial_grade",
        "label": "Editorial-Grade Finish",
        "value": "editorial-grade finish suitable for magazines and campaigns.",
        "order": 2,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "fashion", "branding"]
      },
      {
        "id": "out_soft_cinematic",
        "label": "Soft Cinematic Grading",
        "value": "soft cinematic grading with rich but subtle tonal curves.",
        "order": 3,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "cinematic"]
      },
      {
        "id": "out_ultra_clean",
        "label": "Ultra Clean Render",
        "value": "ultra clean render with minimal noise and strong clarity.",
        "order": 4,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "branding", "clean"]
      },
      {
        "id": "out_beauty_detail",
        "label": "Beauty-Grade Detail",
        "value": "beauty-grade detail level, especially on face, eyes, and hair.",
        "order": 5,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "beauty", "portrait"]
      },
      {
        "id": "out_noise_free",
        "label": "Noise-Free Professional",
        "value": "noise-free professional output while keeping natural texture.",
        "order": 6,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "professional"]
      },
      {
        "id": "out_natural_sharpness",
        "label": "High Sharpness, Natural",
        "value": "high sharpness but still natural, never over-sharpened.",
        "order": 7,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "professional"]
      },
      {
        "id": "out_consistent_color_science",
        "label": "Consistent Color Science",
        "value": "consistent color science across the whole image.",
        "order": 8,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "professional"]
      },
      {
        "id": "out_export_ready",
        "label": "Export-Ready Result",
        "value": "export-ready result suitable for social media, portfolio, or print.",
        "order": 9,
        "visible": true,
        "defaultSelected": false,
        "tags": ["photo", "video", "ugc", "branding"]
      }
    ]
  }
];

async function importData() {
  try {
    console.log('Starting import...');
    
    for (const categoryData of promptCategoriesData) {
      const { id, ...categoryFields } = categoryData;
      
      const categoryDoc = {
        ...categoryFields,
        updatedAt: serverTimestamp(),
      };

      console.log(`Importing category: ${categoryData.name} (${categoryData.options.length} options)`);
      
      await addDoc(collection(db, 'promptCategories'), categoryDoc);
      
      console.log(`✓ Successfully imported: ${categoryData.name}`);
    }
    
    console.log('\n✅ Import completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
}

importData();


