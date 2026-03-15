import { z } from 'zod';
import { getCurrentWorkspace } from '@/lib/db/queries';
import { recordMutationSecurityEvent } from '@/lib/services/mutation-security';

type Workspace = Awaited<ReturnType<typeof getCurrentWorkspace>>;
export type WorkspaceWithBusiness = NonNullable<Workspace> & {
  business: NonNullable<NonNullable<Workspace>['business']>;
};

type MutationErrorTelemetry = {
  request: Request;
  workspace?: WorkspaceWithBusiness | null;
  targetEntityType?: string;
  targetEntityId?: number | null;
};

type ParseJsonBodyOptions = {
  allowEmpty?: boolean;
  telemetry?: Omit<MutationErrorTelemetry, 'request'>;
};

export function mutationErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    { status }
  );
}

export async function mutationErrorResponseWithTelemetry(
  status: number,
  code: string,
  message: string,
  telemetry: MutationErrorTelemetry,
  details?: unknown
) {
  await recordMutationSecurityEvent({
    request: telemetry.request,
    workspace: telemetry.workspace,
    status,
    code,
    message,
    details,
    targetEntityType: telemetry.targetEntityType,
    targetEntityId: telemetry.targetEntityId
  });

  return mutationErrorResponse(status, code, message, details);
}

function getWorkspaceMemberRole(workspace: WorkspaceWithBusiness) {
  const teamMemberRole = workspace.team.teamMembers.find(
    (member) => member.user.id === workspace.user.id
  )?.role;

  return teamMemberRole ?? workspace.user.role;
}

export function isWorkspaceOwner(workspace: WorkspaceWithBusiness) {
  return getWorkspaceMemberRole(workspace) === 'owner';
}

export function assertWorkspaceOwner(workspace: WorkspaceWithBusiness) {
  if (!isWorkspaceOwner(workspace)) {
    throw new Error('Owner role is required for this action.');
  }
}

export async function requireWorkspaceForMutation(
  request: Request,
  options?: {
    ownerOnly?: boolean;
    targetEntityType?: string;
    targetEntityId?: number | null;
  }
) {
  const workspace = await getCurrentWorkspace();
  if (!workspace?.business) {
    return {
      ok: false as const,
      response: await mutationErrorResponseWithTelemetry(
        401,
        'unauthorized',
        'Unauthorized',
        {
          request,
          workspace: null,
          targetEntityType: options?.targetEntityType,
          targetEntityId: options?.targetEntityId
        }
      )
    };
  }

  const typedWorkspace = workspace as WorkspaceWithBusiness;
  if (options?.ownerOnly && !isWorkspaceOwner(typedWorkspace)) {
    return {
      ok: false as const,
      response: await mutationErrorResponseWithTelemetry(
        403,
        'forbidden',
        'Owner role is required for this action.',
        {
          request,
          workspace: typedWorkspace,
          targetEntityType: options?.targetEntityType,
          targetEntityId: options?.targetEntityId
        }
      )
    };
  }

  return {
    ok: true as const,
    workspace: typedWorkspace
  };
}

const positiveIntSchema = z.coerce.number().int().positive();

export async function parseRouteId(
  rawValue: string,
  fieldName: string,
  telemetry?: MutationErrorTelemetry
) {
  const parsed = positiveIntSchema.safeParse(rawValue);
  if (!parsed.success) {
    const message = `${fieldName} must be a positive integer.`;
    return {
      ok: false as const,
      response: telemetry
        ? await mutationErrorResponseWithTelemetry(
            400,
            'invalid_input',
            message,
            telemetry
          )
        : mutationErrorResponse(400, 'invalid_input', message)
    };
  }

  return {
    ok: true as const,
    value: parsed.data
  };
}

export async function parseJsonBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
  options?: ParseJsonBodyOptions
) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    if (options?.allowEmpty) {
      payload = {};
    } else {
      const message = 'Request body must be valid JSON.';
      return {
        ok: false as const,
        response: options?.telemetry
          ? await mutationErrorResponseWithTelemetry(
              400,
              'invalid_input',
              message,
              {
                ...options.telemetry,
                request
              }
            )
          : mutationErrorResponse(400, 'invalid_input', message)
      };
    }
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const details = parsed.error.flatten();
    return {
      ok: false as const,
      response: options?.telemetry
        ? await mutationErrorResponseWithTelemetry(
            400,
            'invalid_input',
            'Request body validation failed.',
            {
              ...options.telemetry,
              request
            },
            details
          )
        : mutationErrorResponse(
            400,
            'invalid_input',
            'Request body validation failed.',
            details
          )
    };
  }

  return {
    ok: true as const,
    data: parsed.data
  };
}
