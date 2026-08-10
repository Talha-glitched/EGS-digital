import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const crmApiSlice = createApi({
  reducerPath: 'crmApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/admin',
    credentials: 'include',
  }),
  tagTypes: ['People', 'Organizations', 'OngoingJobs', 'Tasks', 'Search'],
  keepUnusedDataFor: 300, // 5-minute cache window by default
  endpoints: (builder) => ({
    // --- Global Search Query ---
    globalSearch: builder.query({
      query: (term) => `/search?q=${encodeURIComponent(term || '')}`,
      providesTags: ['Search'],
    }),

    // --- People / Contacts Queries & Mutations ---
    getPeople: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return `/people${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: (result) =>
        result && Array.isArray(result.items)
          ? [
              ...result.items.map(({ id }) => ({ type: 'People', id })),
              { type: 'People', id: 'LIST' },
            ]
          : [{ type: 'People', id: 'LIST' }],
    }),

    getPersonById: builder.query({
      query: (id) => `/people/${id}`,
      providesTags: (result, error, id) => [{ type: 'People', id }],
    }),

    updatePerson: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/people/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'People', id },
        { type: 'People', id: 'LIST' },
      ],
    }),

    deletePerson: builder.mutation({
      query: (id) => ({
        url: `/people/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'People', id },
        { type: 'People', id: 'LIST' },
      ],
    }),

    // --- Organizations / Companies Queries & Mutations ---
    getOrganizations: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return `/companies${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: (result) =>
        result && Array.isArray(result.items)
          ? [
              ...result.items.map(({ id }) => ({ type: 'Organizations', id })),
              { type: 'Organizations', id: 'LIST' },
            ]
          : [{ type: 'Organizations', id: 'LIST' }],
    }),

    getOrganizationById: builder.query({
      query: (id) => `/companies/${id}`,
      providesTags: (result, error, id) => [{ type: 'Organizations', id }],
    }),

    updateOrganization: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/companies/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Organizations', id },
        { type: 'Organizations', id: 'LIST' },
      ],
    }),

    deleteOrganization: builder.mutation({
      query: (id) => ({
        url: `/companies/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Organizations', id },
        { type: 'Organizations', id: 'LIST' },
      ],
    }),

    // --- Ongoing Jobs / Projects Queries & Mutations ---
    getOngoingJobs: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return `/ongoing-jobs${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: (result) =>
        result && Array.isArray(result.items)
          ? [
              ...result.items.map(({ id }) => ({ type: 'OngoingJobs', id })),
              { type: 'OngoingJobs', id: 'LIST' },
            ]
          : [{ type: 'OngoingJobs', id: 'LIST' }],
    }),

    getOngoingJobById: builder.query({
      query: (id) => `/ongoing-jobs/${id}`,
      providesTags: (result, error, id) => [{ type: 'OngoingJobs', id }],
    }),

    updateOngoingJob: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/ongoing-jobs/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'OngoingJobs', id },
        { type: 'OngoingJobs', id: 'LIST' },
      ],
    }),

    // --- Unified Tasks Queries & Mutations ---
    getTasks: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams(params).toString();
        return `/tasks${queryParams ? `?${queryParams}` : ''}`;
      },
      providesTags: (result) =>
        result && Array.isArray(result.items)
          ? [
              ...result.items.map(({ id }) => ({ type: 'Tasks', id })),
              { type: 'Tasks', id: 'LIST' },
            ]
          : [{ type: 'Tasks', id: 'LIST' }],
    }),

    updateTask: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/tasks/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Tasks', id },
        { type: 'Tasks', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGlobalSearchQuery,
  useGetPeopleQuery,
  useGetPersonByIdQuery,
  useUpdatePersonMutation,
  useDeletePersonMutation,
  useGetOrganizationsQuery,
  useGetOrganizationByIdQuery,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useGetOngoingJobsQuery,
  useGetOngoingJobByIdQuery,
  useUpdateOngoingJobMutation,
  useGetTasksQuery,
  useUpdateTaskMutation,
} = crmApiSlice;
