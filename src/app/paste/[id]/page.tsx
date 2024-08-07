'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseExpiration } from "@/utils/parseExpiration";
import { deflate } from "zlib";
import TextArea from "@/components/TextArea";
import HighlightedTextArea from "@/components/HightlightedTextArea";
import { useQuery, useMutation } from '@tanstack/react-query';
import { type Paste } from "@/app/page";

interface PasteViewProps {
  params: { id: string }
}

const fetchPaste = async (id: string): Promise<Paste> => {
  const response = await fetch(`/api/pastes/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch paste');
  }
  return response.json();
};

const updatePaste = async (paste: Paste): Promise<Paste> => {
  const response = await fetch(`/api/pastes/${paste.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paste),
  });

  if (!response.ok) {
    throw new Error('Failed to update paste');
  }

  return response.json();
};

const PasteView: React.FC<PasteViewProps> = ({ params }) => {
  const { id } = params;
  const [content, setContent] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [expired, setExpired] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { data, error, isLoading } = useQuery({
    queryKey: ['paste'],
    queryFn: () => fetchPaste(id),
  });

  const mutation = useMutation({ mutationFn: updatePaste });

  useEffect(() => {
    if (data && !isLoading) {
      const localToken = localStorage.getItem('pasteToken');
      setCanEdit(token === localToken);
      setExpired(new Date().getTime() > data.expirationDate);
      setContent(data.content);
    }
  }, [data, isLoading, token]);

  const handleEdit = useCallback(() => {
    if (canEdit && !expired && data) {
      const updatedPaste = {
        id: data.id,
        content,
        expirationDate: new Date().getTime() + parseExpiration('10m'),
        token: localStorage.getItem('pasteToken') ?? '',
      };
      mutation.mutate(updatedPaste);
    }
  }, [canEdit, expired, data, content, mutation]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading paste</div>;
  return (
    <div>
      {expired ? (
        <div>This paste has expired.</div>
      ) : (
        <>
          <TextArea value={content} onChange={(e) => setContent(e.target.value)} readOnly={!canEdit} />
          {/* <HighlightedTextArea value={content} onChange={(e) => setContent(e.target.value)} readOnly={!canEdit} language="javascript" /> */}
          {canEdit && (
            <button
              className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
              onClick={handleEdit}
            >
              Save
            </button>
          )}
        </>
      )}
    </div>
  )

}

export default PasteView;