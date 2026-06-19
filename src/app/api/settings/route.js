// src/app/api/settings/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Settings from '@/models/Settings';
import { SettingsService } from '@/services/SettingsService';

const SETTINGS_KEY = 'app';

function toSettingsResponse(doc) {
  const plain = doc.toObject ? doc.toObject() : doc;
  const { _id, key, createdAt, updatedAt, __v, ...settings } = plain;
  return {
    ...settings,
    lastUpdated: settings.lastUpdated
      ? new Date(settings.lastUpdated).toISOString()
      : new Date().toISOString(),
  };
}

async function loadSettings() {
  await connectDB();

  let doc = await Settings.findOne({ key: SETTINGS_KEY });

  if (!doc) {
    doc = await Settings.create({
      key: SETTINGS_KEY,
      ...SettingsService.DEFAULT_SETTINGS,
      version: '1.0.0',
      lastUpdated: new Date(),
    });
  }

  return toSettingsResponse(doc);
}

export async function GET() {
  try {
    const settings = await loadSettings();
    const mergedSettings = { ...SettingsService.DEFAULT_SETTINGS, ...settings };

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
      message: 'Settings retrieved successfully',
    });
  } catch (error) {
    console.error('Settings GET API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();

    const validation = SettingsService.validateSettings(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      );
    }

    await connectDB();

    const { key, _id, createdAt, updatedAt, version, ...updates } = body;

    const doc = await Settings.findOneAndUpdate(
      { key: SETTINGS_KEY },
      {
        ...updates,
        key: SETTINGS_KEY,
        lastUpdated: new Date(),
        version: version || '1.0.0',
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const settings = toSettingsResponse(doc);

    SettingsService.clearCache();

    return NextResponse.json({
      success: true,
      settings,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Settings PUT API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function getCurrentSettings() {
  return loadSettings();
}

export async function updateInternalSettings(newSettings) {
  await connectDB();

  const doc = await Settings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    {
      ...newSettings,
      key: SETTINGS_KEY,
      lastUpdated: new Date(),
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return toSettingsResponse(doc);
}
