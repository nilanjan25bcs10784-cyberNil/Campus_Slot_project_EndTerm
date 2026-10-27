import * as waitlistService from '../services/waitlist.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const joinWaitlist = asyncHandler(async (req, res) => {
  const entry = await waitlistService.joinWaitlist({
    userId: req.user._id,
    ...req.body,
  });
  res.status(201).json({
    data: entry,
  });
});

export const getMyWaitlist = asyncHandler(async (req, res) => {
  const entries = await waitlistService.getUserWaitlist(req.user._id);
  res.status(200).json({
    data: entries,
  });
});

export const cancelWaitlist = asyncHandler(async (req, res) => {
  const entry = await waitlistService.cancelWaitlistEntry(
    req.user._id,
    req.params.id,
    req.user.role
  );
  res.status(200).json({
    data: entry,
  });
});
