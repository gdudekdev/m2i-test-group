export interface CommandHandler<TCommand, TResult = void> {
    handle(command: TCommand): Promise<TResult>;
}
