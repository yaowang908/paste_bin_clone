'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { parseExpiration } from "@/utils/parseExpiration";
import { deflate } from "zlib";
import TextArea from "@/components/TextArea";
import HighlightedTextArea from "@/components/HightlightedTextArea";

interface PasteViewProps {
  params: { id: string }
}

const PasteView: React.FC<PasteViewProps> = ({ params }) => {
  const { id } = params;
  const [content, setContent] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [expired, setExpired] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!id) return;
    const pasteData = localStorage.getItem(id);
    if (pasteData) {
      const paste = JSON.parse(pasteData);
      const localToken = localStorage.getItem('pasteToken');

      setCanEdit(token === localToken);
      setExpired(paste.expirationDate < new Date().getTime());
      setContent(paste.content);
    }
  }, [id, token]);

  const handleEdit = () => {
    if (canEdit && !expired) {
      const updatePaste = {
        content,
        expirationDate: new Date().getTime() + parseExpiration('10m'),
        token: localStorage.getItem('pasteToken')
      };
      localStorage.setItem(id, JSON.stringify(updatePaste));
    }
  }

  return (
    <div>
      {expired ? (
        <div>This paste has expired.</div>
      ) : (
        <>
          {/* <TextArea value={content} onChange={(e) => setContent(e.target.value)} readOnly={!canEdit} /> */}
          <HighlightedTextArea value={content} onChange={(e) => setContent(e.target.value)} readOnly={!canEdit} language="javascript" />
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