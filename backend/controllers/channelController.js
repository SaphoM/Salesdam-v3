import channelService from '../services/channelService.js';
import channelProviders from '../services/channelProviders.js';
import { CHANNELS } from '../models/ChannelAccount.js';
import { asyncHandler, sendSuccess } from '../utils/errors.js';

const listAccounts = asyncHandler(async (req, res) => {
  const accounts = await channelService.listAccounts(req.tenantId);
  sendSuccess(res, { data: accounts });
});

// Static channel/provider capabilities for the inbox UI.
const capabilities = asyncHandler(async (_req, res) => {
  sendSuccess(res, {
    data: CHANNELS.map((channel) => ({
      channel,
      ...channelProviders.capabilitiesFor(channel),
    })),
  });
});

const getAccount = asyncHandler(async (req, res) => {
  const account = await channelService.getAccount({
    tenantId: req.tenantId,
    id: req.params.id,
  });
  sendSuccess(res, { data: account });
});

const createAccount = asyncHandler(async (req, res) => {
  const account = await channelService.createAccount({
    tenantId: req.tenantId,
    data: req.body,
    user: req.user,
  });
  sendSuccess(res, { data: account }, 'Channel account created', 201);
});

const updateAccount = asyncHandler(async (req, res) => {
  const account = await channelService.updateAccount({
    tenantId: req.tenantId,
    id: req.params.id,
    updates: req.body,
  });
  sendSuccess(res, { data: account }, 'Channel account updated');
});

const deleteAccount = asyncHandler(async (req, res) => {
  await channelService.deleteAccount({ tenantId: req.tenantId, id: req.params.id });
  sendSuccess(res, {}, 'Channel account deleted');
});

// Public inbound webhook: authenticated by signature, not by session.
const webhook = asyncHandler(async (req, res) => {
  const account = await channelService.resolveWebhookAccount({
    channel: req.params.channel,
    accountId: req.params.accountId,
    req,
  });
  const result = await channelService.ingest({ account, payload: req.body || {} });
  sendSuccess(res, { data: result }, 'Webhook accepted', 202);
});

export {
  listAccounts,
  capabilities,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  webhook,
};
