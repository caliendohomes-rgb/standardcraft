import { defineCollection, z } from 'astro:content';

const resources = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    grade: z.string(),
    grade_band: z.enum(['K-2', '3-5', '6-8', '9-12']),
    subject: z.string(),
    resource_type: z.enum([
      'Lesson Plan',
      'Worksheet',
      'Exit Ticket',
      'Graphic Organizer',
      'Task Card Set',
      'Mini-Assessment',
      'Station Activity',
      'Rubric',
      'Anchor Chart',
      'Co-Teaching Frame',
      'IEP Goal-Support Resource',
      'CDOS Transition Material',
      'Literacy-in-Content-Area Resource',
      'SDI Planning Frame',
    ]),
    duration: z.string(),
    standards_framework: z.string(),
    standards: z.array(z.object({
      code: z.string(),
      text: z.string(),
      source: z.string(),
    })),
    alignment_confidence: z.enum([
      'Full Trust',
      'High Confidence',
      'Needs Human Review',
      'Blocked',
    ]),
    placement: z.array(z.enum([
      'General Education',
      'ICT',
      'Resource Room',
      'Self-Contained',
      'NYSAA',
    ])).optional(),
    sdi_dimensions: z.array(z.enum(['content', 'methodology', 'delivery'])).optional(),
    mll_support_levels: z.array(z.string()).optional(),
    marketplace_title: z.string(),
    marketplace_tags: z.array(z.string()),
    is_sale_ready: z.boolean(),
    human_review: z.enum([
      'Math teacher review pilot eligible',
      'Automated validation + founder oversight',
    ]),
    created_for: z.string().default('StandardCraft NYS Resource Library v1.0'),
    has_answer_key: z.boolean().default(false),
    has_sdi_block: z.boolean().default(true),
    has_mll_block: z.boolean().default(true),
    resource_id: z.string(),
  }),
});

export const collections = { resources };
