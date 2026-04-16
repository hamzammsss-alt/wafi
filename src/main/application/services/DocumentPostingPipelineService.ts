import { PostingCommand, PostJournalResult } from '../../domain/journalEngine/types/PostingTypes';
import { JournalEngineService } from './JournalEngineService';

export interface DocumentPostingContext {
    companyId: string;
    branchId: string;
    userId: string;
    postingDate: string;
}

export interface AccountResolutionEnginePort<TDocument, TResolution> {
    resolve(document: TDocument, context: DocumentPostingContext): Promise<TResolution>;
}

export interface PostingCommandBuilderPort<TDocument, TResolution> {
    build(document: TDocument, resolution: TResolution, context: DocumentPostingContext): PostingCommand;
}

export interface DocumentPostingPipelineRequest<TDocument, TResolution> {
    context: DocumentPostingContext;
    document: TDocument;
    resolver: AccountResolutionEnginePort<TDocument, TResolution>;
    builder: PostingCommandBuilderPort<TDocument, TResolution>;
}

export class DocumentPostingPipelineService {
    constructor(private readonly journalEngine: JournalEngineService) {}

    async postDocument<TDocument, TResolution>(
        request: DocumentPostingPipelineRequest<TDocument, TResolution>,
    ): Promise<PostJournalResult> {
        const resolution = await request.resolver.resolve(request.document, request.context);
        const command = request.builder.build(request.document, resolution, request.context);
        return this.journalEngine.postJournal(command);
    }
}
