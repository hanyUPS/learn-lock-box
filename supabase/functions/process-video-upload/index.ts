import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { videoId, title, description } = await req.json();

    console.log('Processing video upload:', { videoId, title, description });

    // Update video record with metadata
    const { data: video, error: updateError } = await supabase
      .from('videos')
      .update({
        title: title || 'Untitled Video',
        description: description || '',
        status: 'ready', // Mark as ready after processing
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating video:', updateError);
      throw updateError;
    }

    console.log('Video processed successfully:', video);

    return new Response(
      JSON.stringify({ 
        success: true, 
        video,
        message: 'Video processed successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-video-upload:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process video upload',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});