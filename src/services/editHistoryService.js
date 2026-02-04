import { supabase } from '@/lib/supabaseClient';

/**
 * Service for managing edit history
 */

/**
 * Save an edit to history
 * @param {Object} params
 * @param {string} params.editorId - UUID of the editor
 * @param {string} params.editorEmail - Email of the editor
 * @param {string} params.editorName - Name of the editor
 * @param {string} params.editType - Type of edit (text_edit, translation, transcript, etc.)
 * @param {string} params.targetType - What was edited (episode, question, segment, ui_element)
 * @param {string} params.targetId - ID or slug of the edited item
 * @param {string} params.contentBefore - Content before edit
 * @param {string} params.contentAfter - Content after edit
 * @param {string} [params.filePath] - File path for UI edits
 * @param {Object} [params.metadata] - Additional metadata (line, column, language, etc.)
 */
export const saveEditToHistory = async ({
  editorId,
  editorEmail,
  editorName,
  editType,
  targetType,
  targetId,
  contentBefore,
  contentAfter,
  filePath = null,
  metadata = {}
}) => {
  try {
    const { data, error } = await supabase
      .from('edit_history')
      .insert({
        editor_id: editorId,
        editor_email: editorEmail,
        editor_name: editorName,
        edit_type: editType,
        target_type: targetType,
        target_id: targetId,
        file_path: filePath,
        content_before: contentBefore,
        content_after: contentAfter,
        metadata: metadata
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error saving edit to history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get edit history for a specific editor
 * @param {string} editorEmail - Email of the editor
 * @param {number} limit - Maximum number of records to return
 * @param {number} offset - Offset for pagination
 */
export const getEditorHistory = async (editorEmail, limit = 50, offset = 0) => {
  try {
    const { data, error, count } = await supabase
      .from('edit_history_with_editor')
      .select('*', { count: 'exact' })
      .eq('editor_email', editorEmail)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { success: true, data, count };
  } catch (error) {
    console.error('Error fetching editor history:', error);
    return { success: false, error: error.message, data: [], count: 0 };
  }
};

/**
 * Get all edit history (for admin panel)
 * @param {Object} filters
 * @param {string} [filters.editType] - Filter by edit type
 * @param {string} [filters.targetType] - Filter by target type
 * @param {boolean} [filters.showRolledBack] - Include rolled back edits
 * @param {string} [filters.editorEmail] - Filter by editor email
 * @param {number} limit - Maximum number of records to return
 * @param {number} offset - Offset for pagination
 */
export const getAllEditHistory = async (filters = {}, limit = 100, offset = 0) => {
  try {
    let query = supabase
      .from('edit_history_with_editor')
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.editType) {
      query = query.eq('edit_type', filters.editType);
    }
    if (filters.targetType) {
      query = query.eq('target_type', filters.targetType);
    }
    if (filters.editorEmail) {
      query = query.eq('editor_email', filters.editorEmail);
    }
    if (filters.showRolledBack === false) {
      query = query.eq('is_rolled_back', false);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { success: true, data, count };
  } catch (error) {
    console.error('Error fetching all edit history:', error);
    return { success: false, error: error.message, data: [], count: 0 };
  }
};

/**
 * Rollback an edit
 * @param {string} editId - UUID of the edit to rollback
 * @param {string} rolledBackByEmail - Email of the person rolling back
 * @param {string} [rollbackReason] - Reason for rollback
 */
export const rollbackEdit = async (editId, rolledBackByEmail, rollbackReason = null) => {
  try {
    // Try RPC first
    const { data, error } = await supabase.rpc('rollback_edit', {
      p_edit_id: editId,
      p_rolled_back_by_email: rolledBackByEmail,
      p_rollback_reason: rollbackReason
    });

    if (!error) {
       if (!data.success) throw new Error(data.error);
       return { success: true, data: data.data };
    }

    console.warn('RPC rollback_edit failed, trying direct update:', error);
    
    // If RPC failed (e.g. not found), try direct update
    const { data: updatedData, error: updateError } = await supabase
      .from('edit_history')
      .update({
        is_rolled_back: true,
        rolled_back_at: new Date().toISOString(),
        rolled_back_by: rolledBackByEmail,
        rollback_reason: rollbackReason
      })
      .eq('id', editId)
      .select()
      .single();

    if (updateError) throw updateError;
    
    return { success: true, data: updatedData };
  } catch (error) {
    console.error('Error rolling back edit:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get edit history for a specific target
 * @param {string} targetType - Type of target (episode, question, segment, ui_element)
 * @param {string} targetId - ID of the target
 */
export const getTargetHistory = async (targetType, targetId) => {
  try {
    const { data, error } = await supabase
      .from('edit_history_with_editor')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching target history:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Get statistics about edits
 * @param {string} [editorEmail] - Optional: Get stats for specific editor
 */
export const getEditStats = async (editorEmail = null) => {
  try {
    let query = supabase
      .from('edit_history')
      .select('edit_type, created_at, is_rolled_back');

    if (editorEmail) {
      query = query.eq('editor_email', editorEmail);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate stats
    const stats = {
      total: data.length,
      rolledBack: data.filter(e => e.is_rolled_back).length,
      active: data.filter(e => !e.is_rolled_back).length,
      byType: {},
      recent24h: 0,
      recent7d: 0
    };

    const now = new Date();
    const day = 24 * 60 * 60 * 1000;

    data.forEach(edit => {
      // Count by type
      stats.byType[edit.edit_type] = (stats.byType[edit.edit_type] || 0) + 1;

      // Count recent
      const editTime = new Date(edit.created_at);
      const timeDiff = now - editTime;
      if (timeDiff < day) stats.recent24h++;
      if (timeDiff < 7 * day) stats.recent7d++;
    });

    return { success: true, stats };
  } catch (error) {
    console.error('Error fetching edit stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all editors
 */
export const getAllEditors = async () => {
  try {
    const { data, error } = await supabase
      .from('user_editors')
      .select('*')
      .order('last_login', { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching editors:', error);
    return { success: false, error: error.message, data: [] };
  }
};

/**
 * Apply a rollback - this actually restores the previous content
 * This needs to be implemented based on the target type
 * @param {Object} edit - The edit object with rollback data
 */
export const applyRollback = async (edit) => {
  try {
    const { target_type, target_id, content_before, file_path, metadata, editor_id } = edit;

    switch (target_type) {
      case 'ui_element':
        // For UI elements, we would need to call the visual editor API
        if (file_path) {
          // Try to get line/column from metadata or target_id
          let line = metadata?.line;
          let column = metadata?.column;
          
          if ((!line || !column) && target_id && target_id.includes(':')) {
             const parts = target_id.split(':');
             if (parts.length >= 3) {
                column = parts.pop();
                line = parts.pop();
             }
          }

          if (!line || !column) {
             console.error('Cannot determine line/column for rollback', edit);
             throw new Error('Missing line/column information for rollback');
          }

          const response = await fetch('/api/apply-edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              editId: `${file_path}:${line}:${column}`,
              newFullText: content_before
            })
          });

          if (!response.ok) {
            throw new Error('Failed to apply UI rollback');
          }

          return { success: true };
        }
        break;

      case 'transcript':
      case 'segment':
      case 'speaker': {
        // For transcript segments and speaker changes, restore the original state
        if (!metadata?.episodeSlug) {
          return { success: false, error: 'Missing episode information' };
        }

        // Get the current transcript
        let query = supabase
          .from('transcripts')
          .select('*')
          .eq('episode_slug', metadata.episodeSlug);

        if (metadata.lang) {
          query = query.eq('lang', metadata.lang);
        }

        const { data: transcriptData, error: fetchError } = await query.maybeSingle();

        if (fetchError) throw fetchError;
        if (!transcriptData) {
          return { success: false, error: 'Transcript not found' };
        }

        let utterances = Array.isArray(transcriptData.utterances) ? transcriptData.utterances : [];
        const action = metadata?.action;

        // Handle different types of segment operations
        if (action === 'Delete') {
          // Restore deleted segment(s)
          let deletedContent;
          try {
            deletedContent = typeof content_before === 'string' ? JSON.parse(content_before) : content_before;
          } catch (e) {
            console.error('Failed to parse deleted content', e);
          }

          if (!deletedContent) {
            return { success: false, error: 'Cannot rollback delete without content data' };
          }

          let insertIndex = metadata.segmentIndex;
          if (insertIndex === undefined || insertIndex === null) {
             // Fallback: find by time of first element
             const firstSegment = Array.isArray(deletedContent) ? deletedContent[0] : deletedContent;
             insertIndex = utterances.findIndex(u => u.start > firstSegment.start);
             if (insertIndex === -1) insertIndex = utterances.length;
          }

          if (Array.isArray(deletedContent)) {
            utterances.splice(insertIndex, 0, ...deletedContent);
          } else {
            utterances.splice(insertIndex, 0, deletedContent);
          }

        } else if (action === 'Insert' && metadata?.segmentId) {
          // Remove the inserted segment
          utterances = utterances.filter(u => 
            u.id !== metadata.segmentId && u.start !== metadata.startMs
          );

        } else if (action === 'Split') {
           // Restore original segment (merge back)
           let originalSegment;
           try {
             originalSegment = typeof content_before === 'string' ? JSON.parse(content_before) : content_before;
           } catch (e) { return { success: false, error: 'Invalid split data' }; }

           if (!originalSegment || metadata.segmentIndex === undefined) {
             return { success: false, error: 'Missing data for split rollback' };
           }

           // Default to 2 if not specified
           const count = metadata.createdSegmentsCount || 2;
           utterances.splice(metadata.segmentIndex, count, originalSegment);

        } else if (action === 'Merge') {
           // Restore original segments (split back)
           let originalSegments;
           try {
             originalSegments = typeof content_before === 'string' ? JSON.parse(content_before) : content_before;
           } catch (e) { return { success: false, error: 'Invalid merge data' }; }

           if (!originalSegments || !Array.isArray(originalSegments) || metadata.segmentIndex === undefined) {
             return { success: false, error: 'Missing data for merge rollback' };
           }

           utterances.splice(metadata.segmentIndex, 1, ...originalSegments);

        } else if (target_type === 'speaker' || action === 'ChangeSpeaker' || action === 'ReassignSpeaker' || action === 'RenameSpeakerGlobally') {
          // Restore speaker assignment
          const oldSpeaker = metadata?.oldSpeaker;
          const newSpeaker = metadata?.newSpeaker;
          const isGlobal = action === 'RenameSpeakerGlobally';
          
          if (isGlobal) {
            // Restore all segments with the new speaker back to old speaker
            utterances = utterances.map(u => 
              u.speaker === newSpeaker ? { ...u, speaker: oldSpeaker } : u
            );
          } else if (metadata?.segmentId) {
            // Restore specific segment
            const segmentIndex = utterances.findIndex(u => 
              (u.id === metadata.segmentId) || (u.start === metadata.segmentStart)
            );
            if (segmentIndex !== -1) {
              utterances[segmentIndex] = {
                ...utterances[segmentIndex],
                speaker: oldSpeaker
              };
            }
          }

          // Trigger realtime update for speaker changes
          window.dispatchEvent(new CustomEvent('speakerUpdated', { 
            detail: { 
              episodeSlug: metadata.episodeSlug, 
              action: action || 'restored',
              segmentId: metadata?.segmentId,
              oldSpeaker,
              newSpeaker,
              isGlobal
            } 
          }));
        } else if (metadata?.segmentId) {
          // Default: restore text for specific segment
          const segmentIndex = utterances.findIndex(u => 
            (u.id === metadata.segmentId) || (u.start === metadata.segmentStart)
          );

          if (segmentIndex === -1) {
            return { success: false, error: 'Segment not found in transcript' };
          }

          // Restore original text
          utterances[segmentIndex] = {
            ...utterances[segmentIndex],
            text: content_before
          };
        }

        // Save back to database
        const { error: updateError } = await supabase
          .from('transcripts')
          .update({ utterances })
          .eq('id', transcriptData.id);

        if (updateError) throw updateError;

        // Trigger realtime update for transcript changes
        window.dispatchEvent(new CustomEvent('transcriptUpdated', { 
          detail: { 
            episodeSlug: metadata.episodeSlug, 
            action: action || 'restored',
            segmentId: metadata?.segmentId 
          } 
        }));

        return { success: true, message: 'Transcript restored successfully' };
      }

      case 'question': {
        // For questions, restore the original question data
        const questionId = metadata?.questionId || (target_id ? target_id.split('_').pop() : null);
        
        if (!questionId || questionId === 'new') {
          return { success: false, error: 'Missing or invalid question ID' };
        }

        const action = metadata?.action;
        const episodeSlug = metadata?.episodeSlug;

        if (action === 'delete') {
          // For delete, restore from metadata.questionData or content_before
          let originalQuestion = metadata?.questionData;
          if (!originalQuestion) {
            try {
              originalQuestion = typeof content_before === 'string' ? JSON.parse(content_before) : content_before;
            } catch {
              // If parsing fails, extract from text format "Title: X, Time: Ys"
              const titleMatch = content_before.match(/Title:\s*([^,]+)/);
              const timeMatch = content_before.match(/Time:\s*(\d+)/);
              originalQuestion = {
                id: questionId,
                title: titleMatch ? titleMatch[1].trim() : 'Untitled',
                time: timeMatch ? parseInt(timeMatch[1]) : 0,
                episode_slug: episodeSlug
              };
            }
          }

          // Ensure episode_slug is present
          if (!originalQuestion.episode_slug && episodeSlug) {
            originalQuestion.episode_slug = episodeSlug;
          }

          // Sanitize question data to remove fields not in DB schema
          const questionToRestore = { ...originalQuestion };
          delete questionToRestore.is_intro;
          delete questionToRestore.is_full_transcript;

          const { error: insertError } = await supabase
            .from('timecodes')
            .insert(questionToRestore);

          if (insertError) throw insertError;
          
          // Trigger realtime update
          window.dispatchEvent(new CustomEvent('questionUpdated', { 
            detail: { episodeSlug, action: 'restored', questionId } 
          }));
          
          return { success: true, message: 'Question restored successfully' };
        } else if (action === 'add') {
          // For add, delete the question
          const { error: deleteError } = await supabase
            .from('timecodes')
            .delete()
            .eq('id', questionId);

          if (deleteError) throw deleteError;
          
          // Trigger realtime update
          window.dispatchEvent(new CustomEvent('questionUpdated', { 
            detail: { episodeSlug, action: 'deleted', questionId } 
          }));
          
          return { success: true, message: 'Question addition rolled back' };
        } else {
          // For update, restore original data (only title and time, not full object)
          let updateData = {};
          try {
            const parsed = typeof content_before === 'string' ? JSON.parse(content_before) : content_before;
            // Only extract necessary fields
            if (parsed.title !== undefined) updateData.title = parsed.title;
            if (parsed.time !== undefined) updateData.time = parsed.time;
          } catch {
            // Extract from text format
            const titleMatch = content_before.match(/Title:\s*([^,]+)/);
            const timeMatch = content_before.match(/Time:\s*(\d+)/);
            if (titleMatch) updateData.title = titleMatch[1].trim();
            if (timeMatch) updateData.time = parseInt(timeMatch[1]);
          }

          if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No data to restore' };
          }

          const { error: updateError } = await supabase
            .from('timecodes')
            .update(updateData)
            .eq('id', questionId);

          if (updateError) throw updateError;
          
          // Trigger realtime update
          window.dispatchEvent(new CustomEvent('questionUpdated', { 
            detail: { episodeSlug, action: 'updated', questionId, data: updateData } 
          }));
          
          return { success: true, message: 'Question restored successfully' };
        }
      }

      case 'episode': {
        // For episodes, restore the original episode data
        if (!metadata?.episodeSlug && !target_id) {
          return { success: false, error: 'Missing episode slug' };
        }

        const episodeSlug = metadata?.episodeSlug || target_id;
        const action = metadata?.action;
        
        if (action === 'add') {
          // For add operations, delete the added episode
          const { error: deleteError } = await supabase
            .from('episodes')
            .delete()
            .eq('slug', episodeSlug);

          if (deleteError) throw deleteError;

          // Trigger realtime update
          window.dispatchEvent(new CustomEvent('episodeUpdated', { 
            detail: { episodeSlug, action: 'deleted' } 
          }));

          return { success: true, message: 'Episode addition rolled back' };
        } else {
          // For update/delete, parse content_before and only restore specific fields
          let updateData = {};
          try {
            const parsed = typeof content_before === 'string' ? JSON.parse(content_before) : content_before;
            // Only extract user-editable fields, not system fields
            const editableFields = ['title_ru', 'title_en', 'description_ru', 'description_en', 
                                   'tags', 'keywords', 'difficulty', 'published', 'duration_ms'];
            editableFields.forEach(field => {
              if (parsed[field] !== undefined) {
                updateData[field] = parsed[field];
              }
            });
          } catch {
            return { success: false, error: 'Invalid episode data format' };
          }

          if (Object.keys(updateData).length === 0) {
            return { success: false, error: 'No data to restore' };
          }

          const { error: updateError } = await supabase
            .from('episodes')
            .update(updateData)
            .eq('slug', episodeSlug);

          if (updateError) throw updateError;

          // Trigger realtime update
          window.dispatchEvent(new CustomEvent('episodeUpdated', { 
            detail: { episodeSlug, action: 'updated', data: updateData } 
          }));

          return { success: true, message: 'Episode restored successfully' };
        }
      }

      default:
        throw new Error(`Unknown target type: ${target_type}`);
    }

    return { success: false, error: 'Target type not handled' };
  } catch (error) {
    console.error('Error applying rollback:', error);
    return { success: false, error: error.message };
  }
};
