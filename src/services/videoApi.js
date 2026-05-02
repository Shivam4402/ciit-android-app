import axiosClient from '../api/axiosClient';

export const getVideosByFolder = async (folderId) => {
  try {
    if (!folderId) {
      throw new Error("Folder ID is missing");
    }

    const response = await axiosClient.get(`/vimeo/folder/${folderId}`);

    return response?.data?.data || [];

  } catch (error) {
    const status = error?.response?.status;
    const serverMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message;

    if (status === 400) {
      throw new Error("Invalid folder ID");
    }

    if (status === 404) {
      throw new Error("Folder not found");
    }

    if (status === 500 && serverMsg?.includes("400")) {
      throw new Error("Invalid folder ID");
    }

    throw new Error(serverMsg || "Something went wrong");
  }
};




export const getVideosByPlaylist = async (playlistId, pageToken = "") => {
  try {
    if (!playlistId) {
      throw new Error("Playlist ID is missing");
    }

    let url = `/youtube/video-playlist/${playlistId}`;

    if (pageToken) {
      url += `?pageToken=${pageToken}`;
    }

    const response = await axiosClient.get(url);

     const data = response?.data?.data;

    return {
      videos: data?.videos || [],
      nextPageToken: data?.nextPageToken || null,
      totalCount: data?.totalCount || 0 
    };

  } catch (error) {
    const status = error?.response?.status;
    const serverMsg =
      error?.response?.data?.error ||
      error?.response?.data?.message;

    if (status === 400) {
      throw new Error("Invalid playlist ID");
    }

    if (status === 404) {
      throw new Error("Playlist not found");
    }

    throw new Error(serverMsg || "Something went wrong");
  }
};