import fs from 'fs';
let c = fs.readFileSync('client/src/pages/kb/KBDetail.tsx','utf8');

// Add share state after mdText state
c = c.replace(
  "const [mdText, setMdText] = useState(\"\");",
  `const [mdText, setMdText] = useState("");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);`
);

// Add share button in the title bar area, after saveStatus span closing tag
c = c.replace(
  `{saveStatus && (
                <span className={`, 
  `{saveStatus && (
                <span className={\``
);

// Better approach: find the title bar and add share button before the closing </div>
c = c.replace(
  `{saveStatus && (
                <span className=\`text-xs shrink-0 \${saveStatus === "已保存" ? "text-green-600" : "text-slate-400"}\`>
                  {saveStatus}
                </span>
              )}`,
  `{saveStatus && (
                <span className={\`text-xs shrink-0 \${saveStatus === "已保存" ? "text-green-600" : "text-slate-400"}\`}>
                  {saveStatus}
                </span>
              )}
              {currentDocId && (
                <button onClick={handleShare} className="text-xs text-blue-600 hover:text-blue-800 shrink-0" title="分享">
                  🔗 分享
                </button>
              )}`
);

// Add handleShare function after handleImage
c = c.replace(
  `function handleImage() {
    const url = prompt("请输入图片地址", "https://");
    if (url) execCmd("insertImage", url);
  }`,
  `function handleImage() {
    const url = prompt("请输入图片地址", "https://");
    if (url) execCmd("insertImage", url);
  }

  async function handleShare() {
    if (!currentDocId) return;
    try {
      const result = await api.shareNote(currentDocId);
      setShareToken(result.share_token);
      setShowShareModal(true);
    } catch (e) {
      alert("分享失败");
    }
  }

  async function handleUnshare() {
    if (!currentDocId) return;
    await api.unshareNote(currentDocId);
    setShareToken(null);
    setShowShareModal(false);
  }`
);

// Add share modal before the closing </> or style block
c = c.replace(
  `{showCreateModal && (`,
  `{showShareModal && shareToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">分享笔记</h2>
            <div className="text-sm text-slate-600 mb-3">链接已生成，复制发送给他人即可查看：</div>
            <div className="flex gap-2">
              <input className="flex-1 border rounded px-3 py-2 text-sm bg-slate-50" readOnly value={window.location.origin + "/shared/" + shareToken} onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + "/shared/" + shareToken); }} className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">复制</button>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={handleUnshare} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition">取消分享</button>
              <button onClick={() => setShowShareModal(false)} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition">关闭</button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (`
);

fs.writeFileSync('client/src/pages/kb/KBDetail.tsx', c, 'utf8');
console.log("Done");
