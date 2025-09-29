/**
 * Production-ready TTS (Text-to-Speech) system with provider abstraction
 * 
 * Environment Variables Contract:
 * ==============================
 * TTS_PROVIDER=elevenlabs|google|polly (default: mock for development)
 * 
 * ElevenLabs Provider:
 * - ELEVENLABS_API_KEY (required)
 * - ELEVENLABS_VOICE_ID (required) 
 * - ELEVENLABS_MODEL (optional, defaults to 'eleven_multilingual_v2')
 * 
 * Google Cloud TTS:
 * - GOOGLE_APPLICATION_CREDENTIALS (path to service account JSON)
 * - GOOGLE_TTS_LANGUAGE_CODE (optional, defaults to 'es-ES')
 * 
 * AWS Polly:
 * - AWS_ACCESS_KEY_ID (required)
 * - AWS_SECRET_ACCESS_KEY (required) 
 * - AWS_REGION (required)
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface TTSVoiceOptions {
  gender: 'hombre' | 'mujer';
  style: 'neutral' | 'amable' | 'energético';
}

export interface TTSResult {
  url: string;
  durationSec: number;
}

export interface TTSProvider {
  synthesize(text: string, voice: TTSVoiceOptions, outPath: string): Promise<TTSResult>;
}

/**
 * Main TTS synthesis function with provider abstraction
 */
export async function synthesizeTTS(options: {
  text: string;
  voice: TTSVoiceOptions;
  outPath: string;
}): Promise<TTSResult> {
  const provider = process.env.TTS_PROVIDER || 'mock';
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Ensure output directory exists
  const outputDir = path.dirname(options.outPath);
  await fs.mkdir(outputDir, { recursive: true });
  
  // In development without provider, use mock
  if (isDevelopment && provider === 'mock') {
    return createMockTTS(options.text, options.outPath);
  }
  
  // Load and use the appropriate provider
  switch (provider) {
    case 'elevenlabs':
      const { ElevenLabsProvider } = await import('./providers/elevenlabs.js');
      const elevenLabs = new ElevenLabsProvider();
      return elevenLabs.synthesize(options.text, options.voice, options.outPath);
      
    case 'google':
      const { GoogleTTSProvider } = await import('./providers/google.js');
      const google = new GoogleTTSProvider();
      return google.synthesize(options.text, options.voice, options.outPath);
      
    case 'polly':
      const { PollyProvider } = await import('./providers/polly.js');
      const polly = new PollyProvider();
      return polly.synthesize(options.text, options.voice, options.outPath);
      
    default:
      throw new Error(`Unsupported TTS provider: ${provider}. Supported: elevenlabs, google, polly`);
  }
}

/**
 * Development mock TTS generator
 */
async function createMockTTS(text: string, outPath: string): Promise<TTSResult> {
  // Generate a 2-second silence WAV file for development
  const sampleRate = 44100;
  const duration = 2; // seconds
  const numSamples = sampleRate * duration;
  const numChannels = 1;
  
  // WAV header (44 bytes)
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  
  // Format chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Chunk size
  buffer.writeUInt16LE(1, 20);  // Audio format (PCM)
  buffer.writeUInt16LE(numChannels, 22); // Number of channels
  buffer.writeUInt32LE(sampleRate, 24);  // Sample rate
  buffer.writeUInt32LE(sampleRate * numChannels * 2, 28); // Byte rate
  buffer.writeUInt16LE(numChannels * 2, 32); // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  
  // Data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  // Audio data (silence - all zeros)
  buffer.fill(0, 44);
  
  await fs.writeFile(outPath, buffer);
  
  // Return mock URL relative to uploads directory
  const relativePath = path.relative('uploads', outPath);
  return {
    url: `/uploads/${relativePath}`,
    durationSec: duration
  };
}

/**
 * Validate required environment variables for a provider
 */
export function validateTTSConfig(provider?: string): { valid: boolean; missing: string[] } {
  const ttsProvider = provider || process.env.TTS_PROVIDER || 'mock';
  const missing: string[] = [];
  
  switch (ttsProvider) {
    case 'elevenlabs':
      if (!process.env.ELEVENLABS_API_KEY) missing.push('ELEVENLABS_API_KEY');
      if (!process.env.ELEVENLABS_VOICE_ID) missing.push('ELEVENLABS_VOICE_ID');
      break;
      
    case 'google':
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) missing.push('GOOGLE_APPLICATION_CREDENTIALS');
      break;
      
    case 'polly':
      if (!process.env.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
      if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
      if (!process.env.AWS_REGION) missing.push('AWS_REGION');
      break;
      
    case 'mock':
      // No config required for mock
      break;
      
    default:
      missing.push(`Invalid TTS_PROVIDER: ${ttsProvider}`);
  }
  
  return {
    valid: missing.length === 0,
    missing
  };
}