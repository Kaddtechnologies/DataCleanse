import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const updates = await request.json();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      values.push(updates.description);
      paramIndex++;
    }

    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex}`);
      values.push(updates.priority);
      paramIndex++;
    }

    if (updates.enabled !== undefined) {
      updateFields.push(`enabled = $${paramIndex}`);
      values.push(updates.enabled);
      paramIndex++;
    }

    if (updates.conditions !== undefined) {
      updateFields.push(`conditions = $${paramIndex}`);
      values.push(JSON.stringify(updates.conditions));
      paramIndex++;
    }

    if (updates.actions !== undefined) {
      updateFields.push(`actions = $${paramIndex}`);
      values.push(JSON.stringify(updates.actions));
      paramIndex++;
    }

    if (updates.code !== undefined) {
      updateFields.push(`code = $${paramIndex}`);
      values.push(updates.code);
      paramIndex++;
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      values.push(updates.status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Always update last_modified_at
    updateFields.push(`last_modified_at = NOW()`);
    
    // Add rule ID as last parameter
    values.push(params.ruleId);

    const query = `
      UPDATE business_rules 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      rule: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating rule:', error);
    return NextResponse.json(
      { error: 'Failed to update rule' },
      { status: 500 }
    );
  }
}