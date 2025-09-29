/**
 * ElevenLabs TTS Provider
 * 
 * Required Environment Variables:
 * - ELEVENLABS_API_KEY: Your ElevenLabs API key
 * - ELEVENLABS_VOICE_ID: Voice ID to use for synthesis
 * - ELEVENLABS_MODEL: Model to use (optional, defaults to 'eleven_multilingual_v2')
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { TTSProvider, TTSVoiceOptions, TTSResult } from '../index.js';

export class ElevenLabsProvider implements TTSProvider {
  private readonly apiKey: string;
  private readonly voiceId: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID!;
    this.model = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is required');
    }
    if (!this.voiceId) {
      throw new Error('ELEVENLABS_VOICE_ID environment variable is required');
    }
  }

  async synthesize(text: string, voice: TTSVoiceOptions, outPath: string): Promise<TTSResult> {
    try {
      // Map voice options to ElevenLabs voice settings
      const voiceSettings = this.mapVoiceSettings(voice);
      
      const response = await fetch(`${this.baseUrl}/text-to-speech/${this.voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: this.model,
          voice_settings: voiceSettings,
          output_format: 'mp3_44100_128'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
      }

      // Get audio data as array buffer
      const audioBuffer = await response.arrayBuffer();
      const audioData = Buffer.from(audioBuffer);
      
      // Write to output file
      await fs.writeFile(outPath, audioData);
      
      // Estimate duration (rough calculation for MP3)
      // ElevenLabs typically generates around 150-200 words per minute
      const wordCount = text.split(/\s+/).length;
      const estimatedDuration = Math.max(1, Math.ceil(wordCount / 3)); // ~3 words per second
      
      // Return URL relative to uploads directory
      const relativePath = path.relative('uploads', outPath);
      
      return {
        url: `/uploads/${relativePath}`,
        durationSec: estimatedDuration
      };
      
    } catch (error) {
      console.error('ElevenLabs TTS synthesis failed:', error);
      throw new Error(`Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map internal voice options to ElevenLabs voice settings
   */
  private mapVoiceSettings(voice: TTSVoiceOptions) {
    // Base settings
    let stability = 0.75;
    let similarityBoost = 0.75;
    let style = 0.5;
    let useSpeakerBoost = true;

    // Adjust based on voice style
    switch (voice.style) {
      case 'neutral':
        stability = 0.85;
        style = 0.3;
        break;
      case 'amable':
        stability = 0.70;
        similarityBoost = 0.80;
        style = 0.6;
        break;
      case 'energético':
        stability = 0.60;
        similarityBoost = 0.70;
        style = 0.8;
        break;
    }

    // Note: Gender is handled by voice ID selection, not voice settings
    // Users should configure different ELEVENLABS_VOICE_ID for different genders
    
    return {
      stability,
      similarity_boost: similarityBoost,
      style,
      use_speaker_boost: useSpeakerBoost
    };
  }
}