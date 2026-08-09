// Defines the Stripe webhook endpoint. Matches docs/api_design.md §8.
// No auth middleware — Stripe signature verification (Stripe-Signature header) replaces JWT auth here.
import express from 'express';
import * as paymentsController from './payments.controller.js';

const router = express.Router();

router.post('/stripe', paymentsController.handleStripeWebhook);

export default router;
