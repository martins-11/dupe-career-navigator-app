"use client";

import React from "react";

// PUBLIC_INTERFACE
/**
 * Simple dynamic RoleCard for displaying an API role with only API fields.
 */
const RoleCard = ({ role }: { role: any }) => (
  <div className="border rounded-md p-4 shadow-md flex flex-col min-h-[180px]">
    <h2 className="text-xl font-medium mb-2">{role.title || role.role_title}</h2>
    <p className="text-gray-700 mb-3">
      {role.description != null && role.description !== "" ? role.description : <span className="italic text-gray-400">No description provided</span>}
    </p>
    {role.tags && Array.isArray(role.tags) && role.tags.length > 0 && (
      <div className="flex flex-wrap mt-2">
        {role.tags.map((tag: string) => (
          <span
            key={tag}
            className="mr-2 mb-1 px-2 py-1 bg-gray-200 rounded text-xs text-gray-800"
          >
            {tag}
          </span>
        ))}
      </div>
    )}
  </div>
);

export default RoleCard;
