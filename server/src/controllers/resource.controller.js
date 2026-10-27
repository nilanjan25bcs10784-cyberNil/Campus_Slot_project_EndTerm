import * as resourceService from '../services/resource.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getResources = asyncHandler(async (req, res) => {
  const resources = await resourceService.getResources(req.query);
  res.status(200).json({
    data: resources,
  });
});

export const getResourceById = asyncHandler(async (req, res) => {
  const resource = await resourceService.getResourceById(req.params.id);
  res.status(200).json({
    data: resource,
  });
});

export const getAvailability = asyncHandler(async (req, res) => {
  const currentUserId = req.user ? req.user._id : null;
  const availability = await resourceService.getResourceAvailability(
    req.params.id,
    req.query.date,
    currentUserId
  );
  res.status(200).json({
    data: availability,
  });
});

export const createResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.createResource(req.body);
  res.status(201).json({
    data: resource,
  });
});

export const updateResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.updateResource(req.params.id, req.body);
  res.status(200).json({
    data: resource,
  });
});

export const deleteResource = asyncHandler(async (req, res) => {
  const resource = await resourceService.deactivateResource(req.params.id);
  res.status(200).json({
    data: resource,
  });
});
