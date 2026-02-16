// Agency Management API - CRUD operations for marketing agencies
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../utils/supabase-admin.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123';

/**
 * GET /api/admin/agencies
 * Fetch all active agencies (no auth required for reading)
 */
export async function GET(request) {
  try {
    const { data: agencies, error } = await supabaseAdmin
      .from('agencies')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ success: true, agencies });
  } catch (error) {
    console.error('Failed to fetch agencies:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/agencies
 * Create a new agency (admin password required)
 */
export async function POST(request) {
  try {
    const { password, name, contact_email } = await request.json();

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Agency name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('agencies')
      .insert({
        name: name.trim(),
        contact_email: contact_email?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Agency with this name already exists' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, agency: data });
  } catch (error) {
    console.error('Failed to create agency:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/agencies
 * Update an existing agency (admin password required)
 */
export async function PUT(request) {
  try {
    const { password, id, name, contact_email, is_active } = await request.json();

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    // Build update object (only include fields that are provided)
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (contact_email !== undefined) updates.contact_email = contact_email?.trim() || null;
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('agencies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'Agency with this name already exists' },
          { status: 400 }
        );
      }
      throw error;
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Agency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, agency: data });
  } catch (error) {
    console.error('Failed to update agency:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/agencies
 * Soft delete an agency (admin password required)
 */
export async function DELETE(request) {
  try {
    const { password, id } = await request.json();

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin password' },
        { status: 401 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Agency ID is required' },
        { status: 400 }
      );
    }

    // Soft delete (set is_active = false)
    const { data, error } = await supabaseAdmin
      .from('agencies')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Agency not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Agency deactivated successfully',
      agency: data,
    });
  } catch (error) {
    console.error('Failed to delete agency:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
